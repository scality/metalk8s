import kubernetes.client
from kubernetes.client import AppsV1Api
from kubernetes.client.rest import ApiException
import pytest
from pytest_bdd import scenario, given, then, parsers

from tests import kube_utils
from tests import utils

# Scenarios {{{


@scenario("../features/sanity.feature", "List Pods")
def test_list_pods(host):
    pass


@scenario("../features/sanity.feature", "Exec in Pods")
def test_exec_in_pods(host):
    pass


@scenario("../features/sanity.feature", "Read Pod logs")
def test_read_pod_logs(host):
    pass


@scenario(
    "../features/sanity.feature",
    "Static Pod runs where expected",
    example_converters={"namespace": str, "name": str, "role": str},
)
def test_static_pod_running(host):
    pass


@scenario(
    "../features/sanity.feature",
    "Deployment has available replicas",
    example_converters={"namespace": str, "name": str},
)
def test_deployment_running(host):
    pass


@scenario(
    "../features/sanity.feature",
    "DaemonSet has desired Pods ready",
    example_converters={"namespace": str, "name": str},
)
def test_daemonset_running(host):
    pass


@scenario(
    "../features/sanity.feature",
    "StatefulSet has available replicas",
    example_converters={"namespace": str, "name": str},
)
def test_statefulset_running(host):
    pass


@scenario(
    "../features/sanity.feature",
    "Control Plane Ingress Controller when MetalLB is disabled",
)
def test_cp_ingress_controller_no_metallb(host):
    pass


@scenario(
    "../features/sanity.feature",
    "Control Plane Ingress Controller when MetalLB is enabled",
)
def test_cp_ingress_controller_metallb(host):
    pass


# }}}
# Given {{{


@given(parsers.parse("MetalLB is {state}"))
def is_metalb_enabled(host, state):
    expected = state == "enabled"
    if expected != utils.get_pillar(host, "networks:control_plane:metalLB:enabled"):
        pytest.skip("We skip as we run this test only if MetalLB {}".format(state))


# }}}
# Then {{{


@then(
    parsers.parse(
        "we can exec '{command}' in a pod labeled '{label}' "
        "in the '{namespace}' namespace"
    )
)
def check_exec(host, k8s_client, command, label, namespace):
    def _wait_for_pod():
        pods = kube_utils.get_pods(k8s_client, label=label, namespace=namespace)
        assert len(pods) > 0
        return pods[0]

    pod = utils.retry(
        _wait_for_pod, times=10, wait=3, name="wait for pod labeled '{}'".format(label)
    )

    with host.sudo():
        host.check_output(
            "kubectl --kubeconfig=/etc/kubernetes/admin.conf "
            "exec --namespace %s %s %s",
            namespace,
            pod.metadata.name,
            command,
        )


@then(
    parsers.parse(
        "we can read logs from all containers in a pod labeled '{label}' "
        "in the '{namespace}' namespace"
    )
)
def read_pod_logs(k8s_client, label, namespace):
    def _wait_for_pod():
        pods = kube_utils.get_pods(k8s_client, label=label, namespace=namespace)
        assert len(pods) > 0
        return pods[0]

    pod = utils.retry(
        _wait_for_pod, times=10, wait=3, name="wait for pod labeled '{}'".format(label)
    )

    # NOTE: We use Kubernetes client instead of DynamicClient as it
    # ease the retrieving of Pod logs
    client = kubernetes.client.CoreV1Api(api_client=k8s_client.client)

    for container in pod.spec.containers:
        logs = client.read_namespaced_pod_log(
            pod.metadata.name, namespace, container=container.name
        )

        assert logs.strip(), (
            "Couldn't find logs for container '{}' in Pod '{}' (status {})"
        ).format(container.name, pod.metadata.name, pod.status.phase)


@then("the static Pod <name> in the <namespace> namespace runs on <role> nodes")
def check_static_pod(k8s_client, name, namespace, role):
    node_k8s_client = k8s_client.resources.get(api_version="v1", kind="Node")
    if role == "all":
        nodes = node_k8s_client.get()
    else:
        role_label = "node-role.kubernetes.io/{}=".format(role)
        nodes = node_k8s_client.get(label_selector=role_label)

    pod_names = ["{}-{}".format(name, node.metadata.name) for node in nodes.items]
    for pod_name in pod_names:
        utils.retry(
            kube_utils.check_pod_status(
                k8s_client,
                pod_name,
                namespace=namespace,
                state="Running",
            ),
            times=10,
            wait=3,
            name="wait for static Pod '{}/{}'".format(namespace, pod_name),
        )


@then(
    "the Deployment <name> in the <namespace> namespace has all desired "
    "replicas available"
)
@then(
    parsers.parse(
        "the Deployment '{name}' in the '{namespace}' namespace has all desired "
        "replicas available"
    )
)
def check_deployment(k8s_client, name, namespace):
    def _wait_for_deployment():
        try:
            deploy = k8s_client.resources.get(
                api_version="apps/v1", kind="Deployment"
            ).get(name=name, namespace=namespace)
        except ApiException as exc:
            if exc.status == 404:
                pytest.fail("Deployment '{}/{}' does not exist".format(namespace, name))
            raise

        assert deploy.spec.replicas == deploy.status.availableReplicas, (
            "Deployment is not ready yet (desired={desired}, "
            "available={status.available_replicas}, "
            "unavailable={status.unavailable_replicas})"
        ).format(desired=deploy.spec.replicas, status=deploy.status)

    utils.retry(
        _wait_for_deployment,
        times=10,
        wait=3,
        name="wait for Deployment '{}/{}'".format(namespace, name),
    )


@then("the DaemonSet <name> in the <namespace> namespace has all desired " "Pods ready")
@then(
    parsers.parse(
        "the DaemonSet '{name}' in the '{namespace}' namespace has all desired "
        "Pods ready"
    )
)
def check_daemonset(k8s_client, name, namespace):
    def _wait_for_daemon_set():
        try:
            daemon_set = k8s_client.resources.get(
                api_version="apps/v1", kind="DaemonSet"
            ).get(name=name, namespace=namespace)
        except ApiException as exc:
            if exc.status == 404:
                pytest.fail("DaemonSet '{}/{}' does not exist".format(namespace, name))
            raise

        desired = daemon_set.status.desired_number_scheduled
        scheduled = daemon_set.status.current_number_scheduled
        assert desired == scheduled, (
            "DaemonSet is not ready yet (desired={}, scheduled={})"
        ).format(desired, scheduled)
        available = daemon_set.status.number_available
        assert desired == available, (
            "DaemonSet is not ready yet (desired={}, available={})"
        ).format(desired, available)

    utils.retry(
        _wait_for_daemon_set,
        times=10,
        wait=3,
        name="wait for DaemonSet '{}/{}'".format(namespace, name),
    )


@then(
    "the StatefulSet <name> in the <namespace> namespace has all desired "
    "replicas available"
)
def check_statefulset(k8s_client, name, namespace):
    def _wait_for_stateful_set():
        try:
            stateful_set = k8s_client.resources.get(
                api_version="apps/v1", kind="StatefulSet"
            ).get(name=name, namespace=namespace)
        except ApiException as exc:
            if exc.status == 404:
                pytest.fail(
                    "StatefulSet '{}/{}' does not exist".format(namespace, name)
                )
            raise

        desired = stateful_set.spec.replicas
        ready = stateful_set.status.readyReplicas
        assert desired == ready, (
            "StatefulSet is not ready yet (desired={}, ready={})"
        ).format(desired, ready)

    utils.retry(
        _wait_for_stateful_set,
        times=10,
        wait=3,
        name="wait for StatefulSet '{}/{}'".format(namespace, name),
    )


# }}}
