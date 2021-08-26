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
def create_utils_pod(utils_pod):
    pass


@pytest.fixture
def utils_pod(k8s_client, utils_image):
    manifest_file = os.path.join(
        os.path.realpath(os.path.dirname(__file__)), "files", "utils.yaml"
    )
    with open(manifest_file, encoding="utf-8") as fd:
        manifest = yaml.safe_load(fd)

    pod_name = "test-seccomp1"

    manifest["spec"]["containers"][0]["image"] = utils_image
    manifest["metadata"]["name"] = pod_name
    manifest["metadata"]["annotations"] = {
        "seccomp.security.alpha.kubernetes.io/pod": "runtime/default",
    }
    manifest["metadata"]["labels"] = {
        "test": "seccomp1",
    }

    pod_k8s_client = k8s_client.resources.get(api_version="v1", kind="Pod")

    pod_k8s_client.create(body=manifest, namespace="default")

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
