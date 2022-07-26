from kubernetes.client.rest import ApiException

import pytest
from pytest_bdd import parsers, scenario, then, when

from tests import utils


@scenario("../features/operator.feature", "Creation of extra ClusterConfig")
def test_create_extra_clusterconfig(host):
    pass


@scenario("../features/operator.feature", "Deletion of the main ClusterConfig")
def test_delete_main_clusterconfig(host):
    pass


@pytest.fixture(scope="function")
def context():
    return {}


@when(parsers.parse("we create an extra '{cc_name}' ClusterConfig"))
def create_clusterconfig(k8s_client, cc_name):
    body = {
        "apiVersion": "metalk8s.scality.com/v1alpha1",
        "kind": "ClusterConfig",
        "metadata": {"name": cc_name},
        "spec": {},
    }

    k8s_client.resources.get(
        api_version="metalk8s.scality.com/v1alpha1", kind="ClusterConfig"
    ).create(body=body)


@when(parsers.parse("we delete the '{cc_name}' ClusterConfig"))
def delete_clusterconfig(context, k8s_client, cc_name):
    cc_client = k8s_client.resources.get(
        api_version="metalk8s.scality.com/v1alpha1", kind="ClusterConfig"
    )

    context["creation_ts"] = cc_client.get(name=cc_name).metadata.creationTimestamp
    cc_client.delete(name=cc_name)


@then(parsers.parse("the '{cc_name}' ClusterConfig get deleted"))
def clusterconfig_deleted(k8s_client, cc_name):
    def _wait_for_cc_deletion():
        try:
            obj = k8s_client.resources.get(
                api_version="metalk8s.scality.com/v1alpha1", kind="ClusterConfig"
            ).get(name=cc_name)
        except Exception as exc:
            if isinstance(exc, ApiException) and exc.status == 404:
                obj = None
            else:
                raise AssertionError(
                    f"unable to get '{cc_name}' ClusterConfig with error: {exc}"
                )

        assert obj is None, f"{cc_name} ClusterConfig still exists"

    utils.retry(
        _wait_for_cc_deletion,
        times=12,
        wait=5,
        name=f"wait for '{cc_name}' ClusterConfig deletion",
    )


@then(parsers.parse("the '{cc_name}' ClusterConfig get automatically recreated"))
def clusterconfig_get_created(context, k8s_client, cc_name):
    def _wait_for_cc_creation():
        try:
            obj = k8s_client.resources.get(
                api_version="metalk8s.scality.com/v1alpha1", kind="ClusterConfig"
            ).get(name=cc_name)
        except Exception as exc:
            raise AssertionError(
                f"unable to get '{cc_name}' ClusterConfig with error: {exc}"
            )

        assert obj, f"{cc_name} ClusterConfig does not exists"
        assert obj.metadata.creationTimestamp != context["creation_ts"]

    utils.retry(
        _wait_for_cc_creation,
        times=30,
        wait=10,
        name=f"wait for '{cc_name}' ClusterConfig creation",
    )
