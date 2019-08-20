from urllib3.exceptions import HTTPError

from kubernetes.client import CustomObjectsApi
from kubernetes.client import StorageV1Api
from kubernetes.client.rest import ApiException
import pytest
from pytest_bdd import given, when, scenario, then, parsers
import yaml

from tests import utils


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

# }}}
# When {{{

@when(parsers.parse("I create the following Volume:\n{body}"))
def create_volume(host, body, k8s_custom_client):
    k8s_custom_client.create_cluster_custom_object(
        group="storage.metalk8s.scality.com",
        version="v1alpha1",
        plural="volumes",
        body=yaml.safe_load(body)
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
        try:
            volume = k8s_custom_client.get_cluster_custom_object(
                group="storage.metalk8s.scality.com",
                version="v1alpha1",
                plural="volumes",
                name=name
            )
        except (ApiException, HTTPError) as exc:
            if isinstance(exc, ApiException) and exc.status == 404:
                assert False, 'Volume {} not found'.format(name)
            raise
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

# }}}
