import json
import shlex

import kubernetes.client
from kubernetes.client.rest import ApiException
import pytest
from pytest_bdd import scenario, then, parsers

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


@scenario("../features/sanity.feature", "Static Pod runs where expected")
def test_static_pod_running(host):
    pass


@scenario("../features/sanity.feature", "Deployment has available replicas")
def test_deployment_running(host):
    pass


@scenario("../features/sanity.feature", "DaemonSet has desired Pods ready")
def test_daemonset_running(host):
    pass


@scenario("../features/sanity.feature", "Package is installed on every node")
def test_package_installed(host):
    pass


@scenario(
    "../features/sanity.feature", "Systemd unit is enabled and running on every node"
)
def test_systemd_unit_running(host):
    pass


@scenario(
    "../features/sanity.feature", "The worker image cache is filled on every node"
)
def test_worker_image_cache_filled(host):
    pass


@scenario(
    "../features/sanity.feature",
    "Every node is synced to the image caches of its roles",
)
def test_image_caches_synced(host):
    pass


@scenario("../features/sanity.feature", "StatefulSet has available replicas")
def test_statefulset_running(host):
    pass


@scenario(
    "../features/sanity.feature",
    "Dex has available replicas",
)
def test_dex_deploy(host):
    pass


@scenario(
    "../features/sanity.feature",
    "Fluent-bit has available replicas",
)
def test_fluent_bit_ds(host):
    pass


@scenario(
    "../features/sanity.feature",
    "Loki has available replicas",
)
def test_loki_sts(host):
    pass


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
            "exec --namespace %s %s -- %s",
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


@then(
    parsers.parse(
        "the static Pod '{name}' in the '{namespace}' namespace runs on '{role}' nodes"
    )
)
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


@then(
    parsers.parse(
        "the StatefulSet '{name}' in the '{namespace}' namespace has all desired "
        "replicas available"
    )
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


@then(parsers.parse("the package '{name}' is installed on every node"))
def check_package_installed(host, ssh_config, k8s_client, name):
    def _check_package():
        versions = _salt_on_every_node(
            host, ssh_config, k8s_client, "pkg.version", name
        )

        # An absent package answers with an empty string, and a minion that failed
        # to run the function answers with its error message, so only take a version
        # number for an answer, and quote what came back instead.
        missing = {
            node: version
            for node, version in versions.items()
            if not isinstance(version, str) or not version[:1].isdigit()
        }
        answers = ", ".join(
            f"{node} ({version!r})" for node, version in sorted(missing.items())
        )
        assert not missing, f"'{name}' is not installed on {answers}"

    utils.retry(_check_package, times=3, wait=5, name=f"check package '{name}'")


@then(parsers.parse("the systemd unit '{name}' is enabled and running on every node"))
def check_systemd_unit_running(host, ssh_config, k8s_client, name):
    def _check_unit():
        for description, function in [
            ("enabled", "service.enabled"),
            ("running", "service.status"),
        ]:
            results = _salt_on_every_node(host, ssh_config, k8s_client, function, name)

            failed = sorted(
                node for node, result in results.items() if result is not True
            )
            assert not failed, f"'{name}' is not {description} on {', '.join(failed)}"

    utils.retry(_check_unit, times=3, wait=5, name=f"check systemd unit '{name}'")


@then(parsers.parse("every node holds the worker image cache in '{directory}'"))
def check_worker_image_cache(host, ssh_config, k8s_client, version, directory):
    """Check every node holds the worker boot cache of this version.

    The bootstrap node reads it from the ISO, a joining node pulls it from
    the registry. Both write the same directory, named after the ImageCache
    resource, with the sentinel `imagecachectl` writes last.
    """
    sentinel = f"{directory}/worker-{version.replace('.', '-')}/.image-cache-agent.json"

    def _check_sentinel():
        results = _salt_on_every_node(
            host, ssh_config, k8s_client, "file.file_exists", sentinel
        )

        missing = sorted(node for node, found in results.items() if found is not True)
        assert not missing, f"no '{sentinel}' on {', '.join(missing)}"

    utils.retry(_check_sentinel, times=3, wait=5, name=f"check '{sentinel}'")


# The role label each boot cache variant selects, `None` for every node.
IMAGE_CACHE_ROLES = {
    "worker": None,
    "control-plane": "node-role.kubernetes.io/master",
    "etcd": "node-role.kubernetes.io/etcd",
}


@then("every node is synced to the image caches of its roles")
def check_image_caches_synced(k8s_client, version):
    """Check the agent reports each ImageCache of this version synced.

    The agent labels each node it selects with the status of each resource.
    """
    suffix = version.replace(".", "-")

    def _check_labels():
        nodes = k8s_client.resources.get(api_version="v1", kind="Node").get().items
        assert nodes, "no Kubernetes node to check"

        not_synced = []
        for node in nodes:
            labels = node.to_dict()["metadata"].get("labels") or {}
            for variant, role in IMAGE_CACHE_ROLES.items():
                if role is not None and role not in labels:
                    continue
                key = f"image-cache.scality.com/{variant}-{suffix}"
                if labels.get(key) != "synced":
                    not_synced.append(f"{node.metadata.name} ({key}={labels.get(key)})")

        assert not not_synced, f"not synced: {', '.join(not_synced)}"

    utils.retry(_check_labels, times=30, wait=10, name="check image cache labels")


def _salt_on_every_node(host, ssh_config, k8s_client, function, *args):
    """Run a Salt execution function on every node, return the result per node.

    Target the Kubernetes nodes by name rather than every minion, so that a node
    staying silent fails the check instead of dropping out of the results.
    """
    nodes = sorted(
        node.metadata.name
        for node in k8s_client.resources.get(api_version="v1", kind="Node").get().items
    )
    assert nodes, "no Kubernetes node to check"

    # Quoted: the command is joined into one shell line before it runs, so an
    # argument could otherwise be split or glob expanded on the way.
    command = [
        "salt",
        "--static",
        "--out=json",
        "-L",
        ",".join(nodes),
        function,
        *(shlex.quote(arg) for arg in args),
    ]
    results = json.loads(utils.run_salt_command(host, command, ssh_config).stdout)

    silent = sorted(set(nodes) - set(results))
    assert not silent, f"no answer from {', '.join(silent)}"

    return results


# }}}
