import re
from urllib3.exceptions import HTTPError

import kubernetes.client
from kubernetes.client import CustomObjectsApi
from kubernetes.client import StorageV1Api
from kubernetes.client.rest import ApiException
import pytest
from pytest_bdd import given, when, scenario, then, parsers
import yaml

from tests import utils


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
      command: {command}
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


# }}}
# Fixture {{{

@pytest.fixture
def k8s_custom_client(k8s_apiclient):
    return CustomObjectsApi(api_client=k8s_apiclient)

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
def test_volume_creation(host):
    pass

@scenario('../features/volume.feature',
          'Test volume deletion (sparseLoopDevice)')
def test_volume_deletion(host):
    pass

@scenario('../features/volume.feature', 'Test PersistentVolume protection')
def test_pv_protection(host):
    pass

@scenario('../features/volume.feature', 'Create a volume with no volume type')
def test_no_volume_type(host):
    pass

@scenario('../features/volume.feature',
          'Create a volume with an invalid volume type')
def test_invalid_volume_type(host):
    pass

@scenario('../features/volume.feature', 'Test in-use protection')
def test_in_use_protection(host):
    pass

# }}}
# Given {{{

@given(parsers.parse("a Volume '{name}' exist"))
def volume_exist(host, name, k8s_custom_client):
    if _get_volume(k8s_custom_client, name) is not None:
        return
    body = DEFAULT_VOLUME.format(name=name)
    _create_volume(k8s_custom_client, body)
    check_volume_status(host, name, 'Available', k8s_custom_client)


@given(parsers.parse("a PersistentVolumeClaim exists for '{volume_name}'"))
def create_pvc_for_volume(host, volume_name, k8s_client):
    if _get_pv_claim(k8s_client, '{}-pvc'.format(volume_name)) is not None:
        return
    pv = _get_pv(k8s_client, volume_name)
    assert pv is not None, 'PersistentVolume {} not found'.format(volume_name)
    body = PVC_TEMPLATE.format(
        volume_name=volume_name,
        storage_class=pv.spec.storage_class_name,
        access=pv.spec.access_modes[0],
        size=pv.spec.capacity['storage']
    )
    k8s_client.create_namespaced_persistent_volume_claim(
        namespace='default', body=yaml.safe_load(body)
    )


@given(parsers.parse(
    "a Pod using volume '{volume_name}' and running '{command}' exist"
))
def create_pod_for_volume(host, volume_name, command, k8s_client, utils_image):
    pod_name = '{}-pod'.format(volume_name)
    if _get_pod(k8s_client, pod_name) is not None:
        return
    body = POD_TEMPLATE.format(
        volume_name=volume_name, image_name=utils_image, command=command,
    )
    k8s_client.create_namespaced_pod(
        namespace='default', body=yaml.safe_load(body)
    )
    utils.retry(
        kube_utils.wait_for_pod(k8s_client, pod_name),
        times=30, wait=2,
        name="wait for pod {}".format(pod_name)
    )

# }}}
# When {{{

@when(parsers.parse("I create the following Volume:\n{body}"))
def create_volume(host, body, k8s_custom_client):
    _create_volume(k8s_custom_client, body)


@when(parsers.parse("I delete the Volume '{name}'"))
def delete_volume(host, name, k8s_custom_client):
    k8s_custom_client.delete_cluster_custom_object(
        group="storage.metalk8s.scality.com",
        version="v1alpha1",
        plural="volumes",
        name=name,
        body=kubernetes.client.V1DeleteOptions(),
        grace_period_seconds=0
    )


@when(parsers.parse("I delete the PersistentVolume '{name}'"))
def delete_pv(host, name, k8s_client):
    k8s_client.delete_persistent_volume(
        name=name,
        body=kubernetes.client.V1DeleteOptions(),
        grace_period_seconds=0
    )


@when(parsers.parse("I delete the Pod using '{volume_name}'"))
def delete_pod(host, volume_name, k8s_client):
    name = '{}-pod'.format(volume_name)

    def _check_pod_absent():
        assert _get_pod(k8s_client, name) is None,\
            'Volume {} still exist'.format(name)

    k8s_client.delete_namespaced_pod(
        name=name, namespace='default', grace_period_seconds=0
    )
    utils.retry(
        _check_pod_absent, times=30, wait=2,
        name='checking for the absence of pod {}'.format(name)
    )


@when(parsers.parse("I delete the PersistentVolumeClaim on '{volume_name}'"))
def delete_pv_claim(host, volume_name, k8s_client):
    name = '{}-pvc'.format(volume_name)

    def _check_pv_claim_absent():
        assert _get_pv_claim(k8s_client, name) is None,\
            'PersistentVolumeClaim {} still exist'.format(name)

    k8s_client.delete_namespaced_persistent_volume_claim(
        name=name, namespace='default', grace_period_seconds=0
    )
    utils.retry(
        _check_pv_claim_absent, times=10, wait=2,
        name='checking for the absence of PersistentVolumeClaim {}'.format(name)
    )

# }}}
# Then {{{

@then(parsers.parse("we have a StorageClass '{name}'"))
def check_storage_class(host, name, k8s_apiclient):
    k8s_client = StorageV1Api(api_client=k8s_apiclient)
    try:
        k8s_client.read_storage_class(name) is not None
    except (ApiException, HTTPError) as exc:
        if isinstance(exc, ApiException) and exc.status == 404:
            assert False, 'StorageClass {} not found'.format(name)
        raise


@then(parsers.parse("the Volume '{name}' is '{status}'"))
def check_volume_status(host, name, status, k8s_custom_client):
    def _check_volume_status():
        volume = _get_volume(k8s_custom_client, name)
        assert volume is not None, 'Volume {} not found'.format(name)
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
def check_pv_size(host, name, size, k8s_client):
    def _check_pv_size():
        try:
            pv = k8s_client.read_persistent_volume(name)
        except (ApiException, HTTPError) as exc:
            if isinstance(exc, ApiException) and exc.status == 404:
                assert False, 'PersistentVolume {} not found'.format(name)
            raise
        assert pv.spec.capacity['storage'] == size, \
            'Unexpected PersistentVolume size: expected {}, got {}'.format(
                size, pv.spec.capacity['storage']
            )

    utils.retry(
        _check_pv_size, times=10, wait=2,
        name='checking size of PersistentVolume {}'.format(name)
    )


@then(parsers.parse("the Volume '{name}' does not exist"))
def check_volume_absent(host, name, k8s_custom_client):
    def _check_volume_absent():
        assert _get_volume(k8s_custom_client, name) is None,\
            'Volume {} still exist'.format(name)

    utils.retry(
        _check_volume_absent, times=30, wait=2,
        name='checking for the absence of volume {}'.format(name)
    )


@then(parsers.parse("the PersistentVolume '{name}' does not exist"))
def check_pv_absent(name, k8s_client):
    def _check_pv():
        assert _get_pv(k8s_client, name) is None,\
            'PersistentVolume {} exist'.format(name)

    utils.retry(
        _check_pv, times=10, wait=2,
        name='checking the absence of PersistentVolume {}'.format(name)
    )


@then(parsers.parse("the PersistentVolume '{name}' is marked for deletion"))
def check_pv_deletion_marker(name, k8s_client):
    def _check_pv_deletion_marker():
        pv = _get_pv(k8s_client, name)
        assert pv is not None, 'PersistentVolume {} not found'.format(name)
        assert pv.metadata.deletion_timestamp is not None,\
            'PersistentVolume {} is not marked for deletion'.format(name)

    utils.retry(
        _check_pv_deletion_marker, times=10, wait=2,
        name='checking that PersistentVolume {} is marked for deletion'.format(
            name
        )
    )


@then(parsers.parse("the Volume '{name}' is 'Failed' "
                    "with code '{code}' and message matches '{pattern}'"))
def check_volume_error(host, name, code, pattern, k8s_custom_client):
    def _check_error():
        volume = _get_volume(k8s_custom_client, name)
        assert volume is not None, 'Volume {} not found'.format(name)
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
def check_volume_deletion_marker(name, k8s_custom_client):
    def _check_volume_deletion_marker():
        volume = _get_volume(k8s_custom_client, name)
        assert volume is not None, 'Volume {} not found'.format(name)
        assert volume['metadata'].get('deletionTimestamp') is not None,\
            'Volume {} is not marked for deletion'.format(name)

    utils.retry(
        _check_volume_deletion_marker, times=30, wait=2,
        name='checking that Volume {} is marked for deletion'.format(name)
    )

# }}}
# Helpers {{{
# Volume {{{

def _create_volume(k8s_client, body):
    k8s_client.create_cluster_custom_object(
        group="storage.metalk8s.scality.com",
        version="v1alpha1",
        plural="volumes",
        body=yaml.safe_load(body)
    )


def _get_volume(k8s_client, name):
    try:
        return k8s_client.get_cluster_custom_object(
            group="storage.metalk8s.scality.com",
            version="v1alpha1",
            plural="volumes",
            name=name
        )
    except (ApiException, HTTPError) as exc:
        if isinstance(exc, ApiException) and exc.status == 404:
            return None
        raise

# }}}
# PersistentVolume {{{

def _get_pv(k8s_client, name):
    try:
        return k8s_client.read_persistent_volume(name)
    except (ApiException, HTTPError) as exc:
        if isinstance(exc, ApiException) and exc.status == 404:
            return None
        raise

# }}}
# PersistentVolumeClaim {{{

def _get_pv_claim(k8s_client, name, namespace='default'):
    try:
        return k8s_client.read_namespaced_persistent_volume_claim(
            name=name, namespace=namespace
        )
    except (ApiException, HTTPError) as exc:
        if isinstance(exc, ApiException) and exc.status == 404:
            return None
        raise

# }}}
# Pod {{{

def _get_pod(k8s_client, name, namespace='default'):
    try:
        return k8s_client.read_namespaced_pod(name=name, namespace=namespace)
    except (ApiException, HTTPError) as exc:
        if isinstance(exc, ApiException) and exc.status == 404:
            return None
        raise

# }}}
# }}}
