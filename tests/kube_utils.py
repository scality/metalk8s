import abc
import ast
import json
from urllib3.exceptions import HTTPError

import kubernetes.client
from kubernetes.client.rest import ApiException
import yaml

from tests import utils

# Constants {{{

DEFAULT_SC = """
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: {name}
provisioner: kubernetes.io/no-provisioner
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
mountOptions:
  - rw
parameters:
  fsType: ext4
  mkfsOptions: '["-m", "0"]'
"""

DEFAULT_VOLUME = """
apiVersion: storage.metalk8s.scality.com/v1alpha1
kind: Volume
metadata:
  name: {name}
spec:
  nodeName: bootstrap
  storageClassName: metalk8s
  sparseLoopDevice:
    size: 10Gi
"""

POD_TEMPLATE = """
apiVersion: v1
kind: Pod
metadata:
  name: {volume_name}-pod
spec:
  volumes:
    - name: {volume_name}-pod-storage
      persistentVolumeClaim:
        claimName: {volume_name}-pvc
  containers:
    - name: {volume_name}-pod-container
      image: {image_name}
      command: [{command}]
      args: {args}
      volumeMounts:
        - mountPath: "/mnt/"
          name: {volume_name}-pod-storage
  tolerations:
  - key: "node-role.kubernetes.io/bootstrap"
    operator: "Exists"
    effect: "NoSchedule"
  - key: "node-role.kubernetes.io/infra"
    operator: "Exists"
    effect: "NoSchedule"
  terminationGracePeriodSeconds: 0
"""

PVC_TEMPLATE = """
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: {volume_name}-pvc
spec:
  storageClassName: {storage_class}
  accessModes:
      - {access}
  resources:
      requests:
        storage: {size}
"""

# }}}

# See https://kubernetes.io/docs/concepts/architecture/nodes/#condition
# And https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-conditions
MAP_STATUS = {"True": "Ready", "False": "NotReady", "Unknown": "Unknown"}


def get_pods(
    k8s_client, ssh_config=None, label=None, node=None, namespace=None, state="Running"
):
    """Return the pod `component` from the specified node"""
    field_selector = []

    if state:
        field_selector.append("status.phase={}".format(state))

    if node:
        nodename = utils.get_node_name(node, ssh_config)
        field_selector.append("spec.nodeName={}".format(nodename))

    kwargs = {}

    if field_selector:
        kwargs["field_selector"] = ",".join(field_selector)

    if label:
        kwargs["label_selector"] = label

    return k8s_client.resources.get(api_version="v1", kind="Pod").get(**kwargs).items


def check_pod_status(k8s_client, name, namespace="default", state="Running"):
    """Helper to generate a simple assertion method to check a Pod state.

    It is designed to be used with `tests.utils.retry`, and handles 404
    exceptions as transient (i.e. raises an `AssertionError` for a later
    `retry`).
    """

    def _check_pod_status():
        try:
            pod = k8s_client.resources.get(api_version="v1", kind="Pod").get(
                name=name, namespace=namespace
            )
        except ApiException as err:
            if err.status == 404:
                raise AssertionError("Pod not yet created")
            raise

        assert pod.status.phase == state, "Pod not yet '{}'".format(state)

        return pod

    return _check_pod_status


# Client {{{


class Client(abc.ABC):
    """Helper class for manipulation of K8s resources in tests."""

    def __init__(
        self,
        k8s_client,
        kind,
        api_version="v1",
        namespace=None,
        retry_count=10,
        retry_delay=2,
    ):
        self._kind = kind
        self._api_version = api_version
        self._namespace = namespace
        self._client = k8s_client.resources.get(api_version=api_version, kind=kind)
        self._count = retry_count
        self._delay = retry_delay

    def create_from_yaml(self, manifest):
        """Create a new object from the given YAML manifest."""
        self._create(yaml.safe_load(manifest))

    def get(self, name):
        """Return the object identified by `name`, or None if not found."""
        try:
            return self._get(name)
        except (ApiException, HTTPError) as exc:
            if isinstance(exc, ApiException) and exc.status == 404:
                return None
            raise

    def delete(self, name, sync=False):
        """Delete the object identified by `name`.

        If `sync` is True, don't return until the object is actually deleted.
        """
        self._delete(name)
        if sync:
            self.wait_for_deletion(name)

    def delete_all(self, prefix=None, sync=False):
        """Delete all the existing objects.

        If `prefix` is given, only the objects whose name starts with the prefix
        are deleted.
        If `sync` is True, don't return until the object is actually deleted.
        """
        for obj in self.list():
            if isinstance(obj, dict):
                name = obj["metadata"]["name"]
            else:
                name = obj.metadata.name
            if prefix is None or name.startswith(prefix):
                self.delete(name, sync=sync)

    def wait_for_deletion(self, name):
        """Wait for the object to disappear."""

        def _check_absence():
            assert self.get(name) is None, "{} {} still exist".format(self._kind, name)

        utils.retry(
            _check_absence,
            times=self._count,
            wait=self._delay,
            name="checking the absence of {} {}".format(self._kind, name),
        )

    def check_deletion_marker(self, name):
        def _check_deletion_marker():
            obj = self.get(name)
            assert obj is not None, "{} {} not found".format(self._kind, name)
            tstamp = obj["metadata"].get("deletionTimestamp")
            assert tstamp is not None, "{} {} is not marked for deletion".format(
                self._kind, name
            )

        utils.retry(
            _check_deletion_marker,
            times=self._count,
            wait=self._delay,
            name="checking that {} {} is marked for deletion".format(self._kind, name),
        )

    def list(self):
        """Return a list of existing objects."""
        return self._client.get(namespace=self._namespace).items

    def _create(self, body):
        """Create a new object using the given body."""
        return self._client.create(body=body, namespace=self._namespace)

    def _get(self, name):
        """Return the object identified by `name`, raise if not found."""
        return self._client.get(name=name, namespace=self._namespace)

    def _delete(self, name):
        """Delete the object identified by `name`.

        The object may be simply marked for deletion and stay around for a
        while.
        """
        body = kubernetes.client.V1DeleteOptions()
        return self._client.delete(name=name, namespace=self._namespace, body=body)


# }}}
# VolumeClient {{{


class VolumeClient(Client):
    def __init__(self, k8s_client, ssh_config):
        self._ssh_config = ssh_config
        super().__init__(
            k8s_client,
            kind="Volume",
            api_version="storage.metalk8s.scality.com/v1alpha1",
            retry_count=30,
            retry_delay=4,
        )

    def _create(self, body):
        # Fixup the node name.
        body["spec"]["nodeName"] = utils.get_node_name(
            body["spec"]["nodeName"], self._ssh_config
        )
        self._client.create(body=body)

    def wait_for_status(self, name, status, wait_for_device_name=False):
        def _wait_for_status():
            volume = self.get(name)
            assert volume is not None, "Volume not found"

            actual_status = volume.get("status")
            assert actual_status, f"Unexpected status expected {status}, got none"

            phase = self.compute_phase(actual_status)
            assert phase == status, "Unexpected status: expected {}, got {}".format(
                status, phase
            )

            if wait_for_device_name:
                assert (
                    "deviceName" in actual_status.keys()
                ), "Volume status.deviceName has not been reconciled"

            return volume

        return utils.retry(
            _wait_for_status,
            times=24,
            wait=5,  # wait for 2mn
            name="waiting for Volume {} to become {}".format(name, status),
        )

    @staticmethod
    def compute_phase(volume_status):
        for condition in volume_status.get("conditions", []):
            if condition["type"] != "Ready":
                continue
            if condition["status"] == "True":
                return "Available"
            elif condition["status"] == "False":
                return "Failed"
            elif condition["status"] == "Unknown":
                return condition["reason"]
            else:
                assert False, "invalid condition status: {}".format(condition["status"])
        return ""

    @staticmethod
    def get_error(volume_status):
        for condition in volume_status.get("conditions", []):
            if condition["type"] != "Ready":
                continue
            return condition.get("reason", ""), condition.get("message", "")
        return "", ""


# }}}
# PersistentVolumeClient {{{


class PersistentVolumeClient(Client):
    def __init__(self, k8s_client):
        super().__init__(k8s_client, kind="PersistentVolume")


# }}}
# PersistentVolumeClaimClient {{{


class PersistentVolumeClaimClient(Client):
    def __init__(self, k8s_client, namespace="default"):
        super().__init__(k8s_client, kind="PersistentVolumeClaim", namespace=namespace)

    def create_for_volume(self, volume, pv):
        """Create a PVC matching the given volume."""
        assert pv is not None, "PersistentVolume {} not found".format(volume)
        body = PVC_TEMPLATE.format(
            volume_name=volume,
            storage_class=pv.spec.storageClassName,
            access=pv.spec.accessModes[0],
            size=pv.spec.capacity["storage"],
        )
        self.create_from_yaml(body)


# }}}
# PodClient {{{


class PodClient(Client):
    def __init__(self, k8s_client, image, namespace="default"):
        super().__init__(k8s_client, kind="Pod", namespace=namespace, retry_count=30)
        self._k8s_client = k8s_client
        self._image = image

    def create_with_volume(self, volume_name, command):
        """Create a pod using the specified volume."""
        binary, *args = ast.literal_eval(command)
        body = POD_TEMPLATE.format(
            volume_name=volume_name,
            image_name=self._image,
            command=json.dumps(binary),
            args=json.dumps(args),
        )
        self.create_from_yaml(body)
        # Wait for the Pod to be up and running.
        pod_name = "{}-pod".format(volume_name)
        utils.retry(
            check_pod_status(self._k8s_client, pod_name),
            times=self._count,
            wait=self._delay,
            name="wait for pod {}".format(pod_name),
        )

    def _delete(self, name):
        body = kubernetes.client.V1DeleteOptions(grace_period_seconds=0)
        return self._client.delete(name=name, namespace=self._namespace, body=body)


# }}}
# StorageClassClient {{{


class StorageClassClient(Client):
    def __init__(self, k8s_client):
        super().__init__(
            k8s_client,
            kind="StorageClass",
            api_version="storage.k8s.io/v1",
            retry_count=10,
        )


# }}}
