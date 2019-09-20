import abc
import ast
import json
import re
from urllib3.exceptions import HTTPError

import kubernetes as k8s
import kubernetes.client
from kubernetes.client import CustomObjectsApi
from kubernetes.client import StorageV1Api
from kubernetes.client.rest import ApiException
import pytest
from pytest_bdd import given, when, scenario, then, parsers
import yaml

from tests import utils
from tests import kube_utils


# Constants {{{

DEFAULT_VOLUME = """
apiVersion: storage.metalk8s.scality.com/v1alpha1
kind: Volume
metadata:
  name: {name}
spec:
  nodeName: bootstrap
  storageClassName: metalk8s-prometheus
  sparseLoopDevice:
    size: 10Gi
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

# }}}
# Fixture {{{

@pytest.fixture
def volume_client(k8s_apiclient, ssh_config):
    return VolumeClient(CustomObjectsApi(api_client=k8s_apiclient), ssh_config)

@pytest.fixture
def pv_client(k8s_client):
    return PersistentVolumeClient(k8s_client)

@pytest.fixture
def pvc_client(k8s_client):
    return PersistentVolumeClaimClient(k8s_client)

@pytest.fixture
def pod_client(k8s_client, utils_image):
    return PodClient(k8s_client, utils_image)

@pytest.fixture
def sc_client(k8s_apiclient):
    return StorageClassClient(StorageV1Api(api_client=k8s_apiclient))

@pytest.fixture
def teardown(pod_client, pvc_client, volume_client, sc_client):
    yield
    pod_client.delete_all(sync=True)
    pvc_client.delete_all(sync=True)
    volume_client.delete_all(sync=True, prefix='test-')
    sc_client.delete_all(sync=True, prefix='test-')

@pytest.fixture(scope='function')
def context():
    return {}

# }}}
# Scenarios {{{

@scenario('../features/volume.feature', 'Our StorageClass is deployed')
def test_deploy_storage_class(host):
    pass

@scenario('../features/volume.feature', 'The storage operator is up')
def test_deploy_operator(host):
    pass

@scenario('../features/volume.feature',
          'Test volume creation (sparseLoopDevice)')
def test_volume_creation(host, teardown):
    pass

@scenario('../features/volume.feature',
          'Test volume deletion (sparseLoopDevice)')
def test_volume_deletion(host, teardown):
    pass

@scenario('../features/volume.feature', 'Test PersistentVolume protection')
def test_pv_protection(host, teardown):
    pass

@scenario('../features/volume.feature', 'Create a volume with no volume type')
def test_no_volume_type(host, teardown):
    pass

@scenario('../features/volume.feature',
          'Create a volume with an invalid volume type')
def test_invalid_volume_type(host, teardown):
    pass

@scenario('../features/volume.feature', 'Test in-use protection')
def test_in_use_protection(host, teardown):
    pass

@scenario('../features/volume.feature', 'Volume usage (data persistency)')
def test_volume_data_persistency(host, teardown):
    pass

@scenario('../features/volume.feature',
          'Create a volume with unsupported FS type')
def test_volume_invalid_fs_type(host, teardown):
    pass

@scenario('../features/volume.feature',
          'Create a volume using a non-existing StorageClass')
def test_volume_invalid_storage_class(host, teardown):
    pass

@scenario('../features/volume.feature',
          'Delete a Volume with missing StorageClass')
def test_volume_invalid_storage_class(host, teardown):
    pass

# }}}
# Given {{{

@given(parsers.parse("a Volume '{name}' exist"))
def volume_exist(context, name, volume_client):
    if volume_client.get(name) is None:
        volume_client.create_from_yaml(DEFAULT_VOLUME.format(name=name))
        check_volume_status(context, name, 'Available', volume_client)


@given(parsers.parse("a PersistentVolumeClaim exists for '{volume_name}'"))
def create_pvc_for_volume(volume_name, pvc_client, pv_client):
    if pvc_client.get('{}-pvc'.format(volume_name)) is None:
        pvc_client.create_for_volume(volume_name, pv_client.get(volume_name))


@given(parsers.parse(
    "a Pod using volume '{volume_name}' and running '{command}' exist"
))
def pod_exists_for_volume(volume_name, command, pod_client):
    if pod_client.get('{}-pod'.format(volume_name)) is None:
        pod_client.create_with_volume(volume_name, command)


@given(parsers.parse("the StorageClass '{name}' does not exist"))
def storage_class_does_not_exist(name, sc_client):
    sc = sc_client.get(name)
    if sc is not None:
        sc_client.delete(sc.metadata.name)


@given(parsers.parse("a StorageClass '{name}' exist"))
def storage_class_exist(name, sc_client):
    if sc_client.get(name) is None:
        sc_client.create_from_yaml(DEFAULT_SC.format(name=name))

# }}}
# When {{{

@when(parsers.parse("I create the following Volume:\n{body}"))
def create_volume(body, volume_client):
    volume_client.create_from_yaml(body)


@when(parsers.parse("I delete the Volume '{name}'"))
def delete_volume(name, volume_client):
    volume_client.delete(name, sync=False)


@when(parsers.parse("I delete the PersistentVolume '{name}'"))
def delete_pv(name, pv_client):
    pv_client.delete(name)


@when(parsers.parse("I delete the Pod using '{volume_name}'"))
def delete_pod(volume_name, pod_client):
    pod_client.delete('{}-pod'.format(volume_name), sync=True)


@when(parsers.parse("I delete the PersistentVolumeClaim on '{volume_name}'"))
def delete_pv_claim(volume_name, pvc_client):
    pvc_client.delete('{}-pvc'.format(volume_name), sync=True)


@when(parsers.parse(
    "I create a Pod using volume '{volume_name}' and running '{command}'"
))
def create_pod_for_volume(volume_name, command, pod_client):
    pod_client.create_with_volume(volume_name, command)


@when(parsers.parse("I create the following StorageClass:\n{body}"))
def create_storage_class(body, sc_client):
    sc_client.create_from_yaml(body)


@when(parsers.parse("I delete the StorageClass '{name}'"))
def delete_storage_class(name, sc_client):
    sc_client.delete(name, sync=False)

# }}}
# Then {{{

@then(parsers.parse("we have a StorageClass '{name}'"))
def check_storage_class(name, sc_client):
    assert sc_client.get(name) is not None,\
        'StorageClass {} not found'.format(name)


@then(parsers.parse("the Volume '{name}' is '{status}'"))
def check_volume_status(context, name, status, volume_client):
    def _check_volume_status():
        volume = volume_client.get(name)
        assert volume is not None, 'Volume {} not found'.format(name)
        context[name] = volume
        try:
            assert volume['status']['phase'] == status,\
                'Unexpected status: expected {}, got {}'.format(
                    status, volume['status']['phase']
                )
        except KeyError:
            assert status == 'Unknown', \
                'Unexpected status: expected {}, got none'.format(status)

    utils.retry(
        _check_volume_status, times=30, wait=2,
        name='checking status of Volume {}'.format(name)
    )


@then(parsers.parse("the PersistentVolume '{name}' has size '{size}'"))
def check_pv_size(name, size, pv_client):
    def _check_pv_size():
        pv = pv_client.get(name)
        assert pv is not None, 'PersistentVolume {} not found'.format(name)
        assert pv.spec.capacity['storage'] == size, \
            'Unexpected PersistentVolume size: expected {}, got {}'.format(
                size, pv.spec.capacity['storage']
            )

    utils.retry(
        _check_pv_size, times=10, wait=2,
        name='checking size of PersistentVolume {}'.format(name)
    )


@then(parsers.parse(
    "the PersistentVolume '{name}' has label '{key}' with value '{value}'"
))
def check_pv_label(name, key, value, pv_client):
    def _check_pv_label():
        pv = pv_client.get(name)
        assert pv is not None, 'PersistentVolume {} not found'.format(name)
        labels = pv.metadata.labels
        assert key in labels, 'Label {} is missing'.format(key)
        assert labels[key] == value,\
            'Unexpected value for label {}: expected {}, got {}'.format(
                key, value, labels[key]
            )

    utils.retry(
        _check_pv_label, times=10, wait=2,
        name='checking label of PersistentVolume {}'.format(name)
    )


@then(parsers.parse("the Volume '{name}' does not exist"))
def check_volume_absent(name, volume_client):
    volume_client.wait_for_deletion(name)


@then(parsers.parse("the PersistentVolume '{name}' does not exist"))
def check_pv_absent(name, pv_client):
    pv_client.wait_for_deletion(name)


@then(parsers.parse("the PersistentVolume '{name}' is marked for deletion"))
def check_pv_deletion_marker(name, pv_client):
    pv_client.check_deletion_marker(name)


@then(parsers.parse("the Volume '{name}' is 'Failed' "
                    "with code '{code}' and message matches '{pattern}'"))
def check_volume_error(context, name, code, pattern, volume_client):
    def _check_error():
        volume = volume_client.get(name)
        assert volume is not None, 'Volume {} not found'.format(name)
        context[name] = volume
        status = volume.get('status')
        assert status is not None, 'no status for volume {}'.format(name)
        assert status['phase'] == 'Failed',\
            'Unexpected status: expected Failed, got {}'.format(
                status, status['phase']
            )
        assert status['errorCode'] == code,\
            'Unexpected error code: expected {}, got {}'.format(
                code, status['errorCode']
            )
        assert re.search(pattern, status['errorMessage']) is not None,\
            "error message `{}` doesn't match `{}`".format(
                status['errorMessage'], pattern
            )

    utils.retry(
        _check_error, times=30, wait=2,
        name='checking error for Volume {}'.format(name)
    )


@then(parsers.parse("the Volume '{name}' is marked for deletion"))
def check_volume_deletion_marker(name, volume_client):
    volume_client.check_deletion_marker(name)


@then(parsers.parse("the Pod using volume '{volume_name}' "
                    "has a file '{path}' containing '{content}'"))
def check_file_content_inside_pod(volume_name, path, content, k8s_client):
    name = '{}-pod'.format(volume_name)

    def _check_file_content():
        try:
            result = k8s.stream.stream(
                k8s_client.connect_get_namespaced_pod_exec,
                name=name, namespace='default',
                command=['cat', path],
                stderr=True, stdin=False, stdout=True, tty=False
               )
        except ApiException:
            assert False
        assert result.rstrip('\n') == content,\
            'unexpected data in {}: expected "{}", got "{}"'.format(
                path, content, result
            )

    utils.retry(
        _check_file_content, times=10, wait=2,
        name='checking content of {} on Pod {}'.format(path, name)
    )


@then(parsers.parse("the backing storage for Volume '{name}' is created"))
def check_storage_is_created(context, host, name):
    volume = context.get(name)
    assert volume is not None, 'volume {} not found in context'.format(name)
    assert 'sparseLoopDevice' in volume['spec'],\
        'unsupported volume type for this step'
    uuid = volume['metadata']['uid']
    capacity = volume['spec']['sparseLoopDevice']['size']
    # Check that the sparse file exists and has the proper size.
    path = '/var/lib/metalk8s/storage/sparse/{}'.format(uuid)
    size = int(host.check_output('stat -c %s {}'.format(path)))
    assert _quantity_to_bytes(capacity) == size
    # Check that the loop device is mounted.
    host.run_test('test -b /dev/disk/by-uuid/{}'.format(uuid))


@then(parsers.parse("the backing storage for Volume '{name}' is deleted"))
def check_storage_is_deleted(context, host, name):
    volume = context.get(name)
    assert volume is not None, 'volume {} not found in context'.format(name)
    assert 'sparseLoopDevice' in volume['spec'],\
        'unsupported volume type for this step'
    uuid = volume['metadata']['uid']
    # Check that the sparse file is deleted.
    path = '/var/lib/metalk8s/storage/sparse/{}'.format(uuid)
    host.run_test('test ! -f {}'.format(path))
    # Check that the loop device is not mounted.
    host.run_test('test ! -b /dev/disk/by-uuid/{}'.format(uuid))

# }}}
# Helpers {{{
# Client {{{

class Client(abc.ABC):
    def __init__(self, k8s_client, kind, retry_count, retry_delay):
        self._client = k8s_client
        self._kind   = kind
        self._count  = retry_count
        self._delay  = retry_delay

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
                name = obj['metadata']['name']
            else:
                name = obj.metadata.name
            if prefix is None or name.startswith(prefix):
                self.delete(name, sync=sync)

    def wait_for_deletion(self, name):
        """Wait for the object to disappear."""
        def _check_absence():
            assert self.get(name) is None,\
                '{} {} still exist'.format(self._kind, name)

        utils.retry(
            _check_absence, times=self._count, wait=self._delay,
            name='checking the absence of {} {}'.format(self._kind, name)
        )

    def check_deletion_marker(self, name):
        def _check_deletion_marker():
            obj = self.get(name)
            assert obj is not None, '{} {} not found'.format(self._kind, name)
            if isinstance(obj, dict):
                tstamp = obj['metadata'].get('deletionTimestamp')
            else:
                tstamp = obj.metadata.deletion_timestamp
            assert tstamp is not None,\
                '{} {} is not marked for deletion'.format(self._kind, name)

        utils.retry(
            _check_deletion_marker, times=self._count, wait=self._delay,
            name='checking that {} {} is marked for deletion'.format(
                self._kind, name
            )
        )


    @abc.abstractmethod
    def list(self):
        """Return a list of existing objects."""
        pass

    @abc.abstractmethod
    def _create(self, body):
        """Create a new object using the given body."""
        pass

    @abc.abstractmethod
    def _get(self, name):
        """Return the object identified by `name`, raise if not found."""
        pass

    @abc.abstractmethod
    def _delete(self, name):
        """Delete the object identified by `name`.

        The object may be simply marked for deletion and stay around for a
        while.
        """
        pass

# }}}
# VolumeClient {{{

class VolumeClient(Client):
    def __init__(self, k8s_client, ssh_config):
        super().__init__(
            k8s_client, kind='Volume', retry_count=30, retry_delay=2
        )
        self._ssh_config = ssh_config
        self._group="storage.metalk8s.scality.com"
        self._version="v1alpha1"
        self._plural="volumes"

    def list(self):
        return self._client.list_cluster_custom_object(
            group=self._group, version=self._version, plural=self._plural
        )['items']

    def _create(self, body):
        # Fixup the hostname.
        body['spec']['nodeName'] = utils.resolve_hostname(
            body['spec']['nodeName'], self._ssh_config
        )
        self._client.create_cluster_custom_object(
            group=self._group, version=self._version, plural=self._plural,
            body=body
        )

    def _get(self, name):
        return self._client.get_cluster_custom_object(
            group=self._group, version=self._version, plural=self._plural,
            name=name
        )

    def _delete(self, name):
        body = kubernetes.client.V1DeleteOptions()
        self._client.delete_cluster_custom_object(
            group=self._group, version=self._version, plural=self._plural,
            name=name, body=body, grace_period_seconds=0
        )

# }}}
# PersistentVolumeClient {{{

class PersistentVolumeClient(Client):
    def __init__(self, k8s_client):
        super().__init__(
            k8s_client, kind='PersistentVolume',
            retry_count=10, retry_delay=2
        )

    def list(self):
        return self._client.list_persistent_volume().items

    def _create(self, body):
        self._client.create_persistent_volume(body=body)

    def _get(self, name):
        return self._client.read_persistent_volume(name)

    def _delete(self, name):
        body = kubernetes.client.V1DeleteOptions()
        self._client.delete_persistent_volume(
            name=name, body=body, grace_period_seconds=0
        )

# }}}
# PersistentVolumeClaimClient {{{

class PersistentVolumeClaimClient(Client):
    def __init__(self, k8s_client, namespace='default'):
        super().__init__(
            k8s_client, kind='PersistentVolumeClaim',
            retry_count=10, retry_delay=2
        )
        self._namespace = namespace

    def create_for_volume(self, volume, pv):
        """Create a PVC matching the given volume."""
        assert pv is not None, 'PersistentVolume {} not found'.format(volume)
        body = PVC_TEMPLATE.format(
            volume_name=volume,
            storage_class=pv.spec.storage_class_name,
            access=pv.spec.access_modes[0],
            size=pv.spec.capacity['storage']
        )
        self.create_from_yaml(body)

    def list(self):
        return self._client.list_namespaced_persistent_volume_claim(
            namespace=self._namespace
        ).items

    def _create(self, body):
        self._client.create_namespaced_persistent_volume_claim(
            namespace=self._namespace, body=body
        )

    def _get(self, name):
        return self._client.read_namespaced_persistent_volume_claim(
            name=name, namespace=self._namespace
        )

    def _delete(self, name):
        self._client.delete_namespaced_persistent_volume_claim(
            name=name, namespace=self._namespace, grace_period_seconds=0
        )

# }}}
# PodClient {{{

class PodClient(Client):
    def __init__(self, k8s_client, image, namespace='default'):
        super().__init__(
            k8s_client, kind='Pod', retry_count=30, retry_delay=2
        )
        self._image = image
        self._namespace = namespace

    def create_with_volume(self, volume_name, command):
        """Create a pod using the specified volume."""
        binary, *args = ast.literal_eval(command)
        body = POD_TEMPLATE.format(
            volume_name=volume_name, image_name=self._image,
            command=json.dumps(binary), args=json.dumps(args)
        )
        self.create_from_yaml(body)
        # Wait for the Pod to be up and running.
        pod_name = '{}-pod'.format(volume_name)
        utils.retry(
            kube_utils.check_pod_status(self._client, pod_name),
            times=self._count, wait=self._delay,
            name="wait for pod {}".format(pod_name)
        )

    def list(self):
        return self._client.list_namespaced_pod(namespace=self._namespace).items

    def _create(self, body):
        self._client.create_namespaced_pod(namespace=self._namespace, body=body)

    def _get(self, name):
        return self._client.read_namespaced_pod(
            name=name, namespace=self._namespace
        )

    def _delete(self, name):
        self._client.delete_namespaced_pod(
            name=name, namespace=self._namespace, grace_period_seconds=0
        )

# }}}
# StorageClassClient {{{

class StorageClassClient(Client):
    def __init__(self, k8s_client):
        super().__init__(
            k8s_client, kind='StorageClass', retry_count=10, retry_delay=2
        )

    def list(self):
        return self._client.list_storage_class().items

    def _create(self, body):
        self._client.create_storage_class(body=body)

    def _get(self, name):
        return self._client.read_storage_class(name=name)

    def _delete(self, name):
        self._client.delete_storage_class(name=name, grace_period_seconds=0)

# }}}

def _quantity_to_bytes(quantity):
    """Return a quantity with a unit converted into a number of bytes.

    Examples:
    >>> quantity_to_bytes('42Gi')
    45097156608
    >>> quantity_to_bytes('100M')
    100000000
    >>> quantity_to_bytes('1024')
    1024

    Args:
        quantity (str): a quantity, composed of a count and an optional unit

    Returns:
        int: the capacity (in bytes)
    """
    UNIT_FACTOR = {
      None:  1,
      'Ki':  2 ** 10,
      'Mi':  2 ** 20,
      'Gi':  2 ** 30,
      'Ti':  2 ** 40,
      'Pi':  2 ** 50,
      'k':  10 ** 3,
      'M':  10 ** 6,
      'G':  10 ** 9,
      'T':  10 ** 12,
      'P':  10 ** 15,
    }
    size_regex = r'^(?P<size>[1-9][0-9]*)(?P<unit>[kKMGTP]i?)?$'
    match = re.match(size_regex, quantity)
    assert match is not None, 'invalid resource.Quantity value'
    size = int(match.groupdict()['size'])
    unit = match.groupdict().get('unit')
    return size * UNIT_FACTOR[unit]

# }}}
