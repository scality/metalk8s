# coding: utf-8

import json

from kubernetes.client.rest import ApiException
import pytest
from pytest_bdd import given, parsers, then

from tests import kube_utils, utils
from tests.conftest import wait_rollout_status

# Fixtures {{{


@pytest.fixture
def volume_client(k8s_client, ssh_config):
    return kube_utils.VolumeClient(k8s_client, ssh_config)


@pytest.fixture
def pv_client(k8s_client):
    return kube_utils.PersistentVolumeClient(k8s_client)


@pytest.fixture
def pvc_client(k8s_client):
    return kube_utils.PersistentVolumeClaimClient(k8s_client)


@pytest.fixture
def pod_client(k8s_client, utils_image):
    return kube_utils.PodClient(k8s_client, utils_image)


@pytest.fixture
def sc_client(k8s_client):
    return kube_utils.StorageClassClient(k8s_client)


@pytest.fixture
def clusterissuer_client(k8s_client):
    return kube_utils.ClusterIssuerClient(k8s_client)


@pytest.fixture
def cert_client(k8s_client):
    return kube_utils.CertificateClient(k8s_client)


@pytest.fixture
def secret_client(k8s_client):
    return kube_utils.SecretClient(k8s_client)


# }}}
# Helpers {{{


def _check_pods_status(
    k8s_client, expected_status, ssh_config, namespace=None, label=None
):
    # Helper to use retry utils
    def _wait_for_status():
        pods = kube_utils.get_pods(k8s_client, ssh_config, label, namespace=namespace)
        assert pods

        for pod in pods:
            # If really not ready, status may not have been pushed yet.
            if pod.status.conditions is None:
                assert expected_status == "NotReady"
                continue

            for condition in pod.status.conditions:
                if condition.type == "Ready":
                    break
            assert kube_utils.MAP_STATUS[condition.status] == expected_status

        return pods

    name = "wait for pods"
    if namespace:
        name += " in namespace {}".format(namespace)
    else:
        name += " in all namespaces"
    if label:
        name += " with label '{}'".format(label)

    # Wait for pod to be in the correct state
    utils.retry(_wait_for_status, times=24, wait=5, name=name)


# }}}


_PARSE_PODS_WITH_LABEL_STATUS = parsers.parse(
    "pods with label '{label}' are '{expected_status}'"
)


# Given {{{


@given(_PARSE_PODS_WITH_LABEL_STATUS)
def given_check_pod_status(request, host, k8s_client, label, expected_status):
    ssh_config = request.config.getoption("--ssh-config")

    _check_pods_status(k8s_client, expected_status, ssh_config, label=label)


@given(parsers.parse("all Pod are '{expected_status}'"))
def check_all_pods_status(request, host, k8s_client, expected_status):
    ssh_config = request.config.getoption("--ssh-config")

    _check_pods_status(k8s_client, expected_status, ssh_config)


@given(parsers.parse("a test Volume '{name}' exists"))
def test_volume(volume_client, name):
    """Get or create a Volume by name and return it as a fixture.

    Volume will be deleted after execution of the test.
    """
    if volume_client.get(name) is None:
        volume_client.create_from_yaml(kube_utils.DEFAULT_VOLUME.format(name=name))

    try:
        yield volume_client.wait_for_status(
            name, "Available", wait_for_key="deviceName"
        )
    finally:
        volume_client.delete(name, sync=True)


@given("we are on a multi node cluster")
def check_multi_node(k8s_client):
    nodes = k8s_client.resources.get(api_version="v1", kind="Node").get()

    if len(nodes.items) == 1:
        pytest.skip("We skip single node cluster for this test")


@given("the node control-plane IP is not equal to its workload-plane IP")
def node_control_plane_ip_is_not_equal_to_its_workload_plane_ip(host):
    data = utils.get_grain(host, "metalk8s")

    assert "control_plane_ip" in data
    assert "workload_plane_ip" in data

    if data["control_plane_ip"] == data["workload_plane_ip"]:
        pytest.skip("Node control-plane IP is equal to node workload-plane IP")


@given("the Prometheus API is available")
def check_prometheus_api(prometheus_api):
    try:
        prometheus_api.get_targets()
    except utils.PrometheusApiError as exc:
        pytest.fail(str(exc))


@given("the Salt Master is available")
def check_salt_master(host, ssh_config):
    try:
        result = utils.run_salt_command(
            host,
            [
                "salt-run",
                "salt.cmd",
                "test.ping",
                "--out=json",
                "--log-level=quiet",
            ],
            ssh_config,
        )
        if not json.loads(result.stdout):
            pytest.fail("Salt Master is not available")
    except Exception as exc:
        pytest.fail(f"Salt Master is not available: {exc!s}")


# }}}

# Then {{{


@then(_PARSE_PODS_WITH_LABEL_STATUS)
def then_check_pod_status(request, host, k8s_client, label, expected_status):
    ssh_config = request.config.getoption("--ssh-config")

    _check_pods_status(k8s_client, expected_status, ssh_config, label=label)


@then(parsers.parse("each pods with label '{selector}' are on a different node"))
def then_check_pod_different_node(ssh_config, host, k8s_client, selector):
    pods = kube_utils.get_pods(k8s_client, ssh_config, selector)
    assert pods

    nodes = set()

    for pod in pods:
        assert (
            pod.spec.nodeName not in nodes
        ), f"Node '{pod.spec.nodeName}' has several Pod with label '{selector}'"
        nodes.add(pod.spec.nodeName)


@then("the DaemonSet <name> in the <namespace> namespace has all desired Pods ready")
@then(
    parsers.parse(
        "the DaemonSet '{name}' in the '{namespace}' namespace has all desired "
        "Pods ready"
    )
)
def check_daemonset(host, k8s_client, name, namespace):
    def _wait_for_daemon_set():
        try:
            daemon_set = k8s_client.resources.get(
                api_version="apps/v1", kind="DaemonSet"
            ).get(name=name, namespace=namespace)
        except ApiException as exc:
            if exc.status == 404:
                pytest.fail(f"DaemonSet '{namespace}/{name}' does not exist")
            raise

        desired = daemon_set.status.desired_number_scheduled
        scheduled = daemon_set.status.current_number_scheduled
        assert (
            desired == scheduled
        ), f"DaemonSet is not ready yet (desired={desired}, scheduled={scheduled})"
        available = daemon_set.status.number_available
        assert (
            desired == available
        ), f"DaemonSet is not ready yet (desired={desired}, available={available})"

        # The DaemonSet status counters do not account for pods being
        # terminated: during a rolling update, the new pod is reported as
        # available as soon as it is Ready, while the old one can still be
        # in `Terminating` (long `terminationGracePeriodSeconds`, draining
        # `preStop` hook, finalizers, ...).  Make sure no pod from a
        # previous revision is still around before declaring the DaemonSet
        # fully ready.
        label_selector = ",".join(
            f"{key}={value}"
            for key, value in daemon_set.spec.selector.matchLabels.items()
        )
        pods = (
            k8s_client.resources.get(api_version="v1", kind="Pod")
            .get(namespace=namespace, label_selector=label_selector)
            .items
        )
        terminating_pods = []
        not_ready_pods = []
        for pod in pods:
            if pod.metadata.deletionTimestamp is not None:
                terminating_pods.append(pod.metadata.name)
            elif pod.status.conditions is not None:
                for condition in pod.status.conditions:
                    if condition.type == "Ready" and condition.status != "True":
                        not_ready_pods.append(pod.metadata.name)

        assert (
            not terminating_pods
        ), f"DaemonSet is not ready yet, some pods are still terminating: {', '.join(terminating_pods)}"
        assert (
            not not_ready_pods
        ), f"DaemonSet is not ready yet, some pods are not ready: {', '.join(not_ready_pods)}"

    utils.retry(
        _wait_for_daemon_set,
        times=60,
        wait=3,
        name=f"wait for DaemonSet '{namespace}/{name}'",
    )

    wait_rollout_status(host, f"daemonset/{name}", namespace)


# }}}
