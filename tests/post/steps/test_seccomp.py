import os.path

import yaml

from kubernetes import client

import pytest
from pytest_bdd import scenario, when

from tests import kube_utils
from tests import utils


@scenario(
    "../features/seccomp.feature",
    "Running a Pod with the 'runtime/default' seccomp profile works",
)
def test_seccomp(host):
    pass


@when(
    "we create a utils Pod with labels {'test': 'seccomp1'} "
    "and annotations "
    "{'seccomp.security.alpha.kubernetes.io/pod': 'runtime/default'}"
)
def create_utils_pod(seccomp_pod):
    pass


@pytest.fixture
def seccomp_pod(k8s_client, utils_manifest):
    pod_name = "test-seccomp1"

    utils_manifest["metadata"]["name"] = pod_name
    utils_manifest["metadata"]["annotations"] = {
        "seccomp.security.alpha.kubernetes.io/pod": "runtime/default",
    }
    utils_manifest["metadata"]["labels"] = {
        "test": "seccomp1",
    }

    pod_k8s_client = k8s_client.resources.get(api_version="v1", kind="Pod")

    pod_k8s_client.create(body=utils_manifest, namespace="default")

    try:
        yield pod_name
    finally:
        pod_k8s_client.delete(
            name=pod_name,
            namespace="default",
            body=client.V1DeleteOptions(
                grace_period_seconds=0,
            ),
        )
