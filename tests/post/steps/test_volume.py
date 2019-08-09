from urllib3.exceptions import HTTPError

from kubernetes.client import StorageV1Api
from kubernetes.client.rest import ApiException
import pytest
from pytest_bdd import scenario, then, parsers

# Scenarios {{{

@scenario('../features/volume.feature', 'Our StorageClass is deployed')
def test_deploy_storage_class(host):
    pass

@scenario('../features/volume.feature', 'The storage operator is up')
def test_deploy_operator(host):
    pass

# }}}

@then(parsers.parse("we have a StorageClass '{name}'"))
def check_storage_class(host, name, k8s_apiclient):
    k8s_client = StorageV1Api(api_client=k8s_apiclient)
    try:
        k8s_client.read_storage_class(name) is not None
    except (ApiException, HTTPError) as exc:
        if isinstance(exc, ApiException) and exc.status == 404:
            assert False, 'StorageClass {} not found'.format(name)
        raise
