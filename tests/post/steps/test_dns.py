import os

from kubernetes import client, config
import pytest
from pytest_bdd import scenario, then, parsers
import yaml

from tests import kube_utils
from tests import utils


@pytest.fixture
def busybox_pod(kubeconfig):
    config.load_kube_config(config_file=kubeconfig)
    k8s_client = client.CoreV1Api()

    # Create the busybox pod
    pod_manifest = os.path.join(
        os.path.realpath(os.path.dirname(__file__)),
        "files",
        "busybox.yaml"
    )
    with open(pod_manifest, encoding='utf-8') as pod_fd:
        pod_manifest_content = yaml.safe_load(pod_fd)

    k8s_client.create_namespaced_pod(
        body=pod_manifest_content, namespace="default"
    )

    # Wait for the busybox to be ready
    utils.retry(
        kube_utils.wait_for_pod(
            k8s_client, name="busybox", namespace="default", state="Running"
        ),
        times=10,
        name="wait for Pod 'busybox'",
    )

    yield "busybox"

    # Clean-up resources
    k8s_client.delete_namespaced_pod(
        name="busybox",
        namespace="default",
        body=client.V1DeleteOptions(),
    )


# Scenarios
@scenario('../features/dns_resolution.feature', 'check DNS')
def test_dns(host):
    pass


@then(parsers.parse("the hostname '{hostname}' should be resolved"))
def resolve_hostname(busybox_pod, host, hostname):
    with host.sudo():
        # test dns resolve
        result = host.run(
            "kubectl --kubeconfig=/etc/kubernetes/admin.conf "
            "exec -ti %s nslookup %s",
            busybox_pod,
            hostname,
        )

        assert result.rc == 0, "Cannot resolve {}".format(hostname)
