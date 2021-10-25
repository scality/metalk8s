import os

from kubernetes import client
import pytest
from pytest_bdd import scenario, then, parsers
import yaml

from tests import kube_utils
from tests import utils


@pytest.fixture
def utils_pod(k8s_client, utils_image):
    # Create the Pod
    manifest_file = os.path.join(
        os.path.realpath(os.path.dirname(__file__)), "files", "utils.yaml"
    )
    with open(manifest_file, encoding="utf-8") as fd:
        manifest = yaml.safe_load(fd)

    manifest["spec"]["containers"][0]["image"] = utils_image
    pod_name = manifest["metadata"]["name"]

    pod_k8s_client = k8s_client.resources.get(api_version="v1", kind="Pod")

    pod_k8s_client.create(body=manifest, namespace="default")

    # Wait for the Pod to be ready
    utils.retry(
        kube_utils.check_pod_status(
            k8s_client, name=pod_name, namespace="default", state="Running"
        ),
        times=10,
        wait=12,
        name="wait for Pod '{}'".format(pod_name),
    )

    yield pod_name

    # Clean-up resources
    pod_k8s_client.delete(
        name=pod_name,
        namespace="default",
        body=client.V1DeleteOptions(
            grace_period_seconds=0,  # Force deletion instantly
        ),
    )


# Scenarios
@scenario("../features/dns_resolution.feature", "check DNS")
def test_dns(host):
    pass


@scenario("../features/dns_resolution.feature", "DNS pods spreading")
def test_dns_spread(host):
    pass


@then(parsers.parse("the hostname '{hostname}' should be resolved"))
def resolve_hostname(utils_pod, host, hostname):
    with host.sudo():
        # test dns resolve
        result = host.run(
            "kubectl --kubeconfig=/etc/kubernetes/admin.conf " "exec %s nslookup %s",
            utils_pod,
            hostname,
        )
        if result.rc != 0:
            pytest.fail("Cannot resolve {}: {}".format(hostname, result.stderr))
