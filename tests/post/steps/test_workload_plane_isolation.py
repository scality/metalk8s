# coding: utf-8
"""End-to-end validation of the Workload Plane isolation flow.

Detection (node-problem-detector sets the PodNetworkUnavailable condition) ->
remediation (node-warden taints the node NoExecute) -> traffic drained (pods
evicted, node out of the Service endpoints) -> recovery on restore, plus the
false-positive and guard-suppression safeguards.

These scenarios require a segregated-network cluster (separate control plane
and workload plane) with at least 3 nodes, so the majority quorum can tell a
single-node isolation apart from a global outage.
"""

import json
import time

import kubernetes.client
import pytest
import testinfra
from pytest_bdd import parsers, scenario, given, when, then

from tests import utils

WORKLOAD_NAMESPACE = "wp-test"


# Scenarios {{{


@scenario(
    "../features/workload_plane_isolation.feature",
    "An isolated node is drained and recovers (<mode>)",
    example_converters={"mode": str},
)
def test_isolated_node_drained_and_recovers(host, teardown):
    pass


@scenario(
    "../features/workload_plane_isolation.feature",
    "A Calico rolling restart does not trigger remediation",
)
def test_calico_restart_no_remediation(host, teardown):
    pass


@scenario(
    "../features/workload_plane_isolation.feature",
    "A short Workload Plane blip does not trigger remediation",
)
def test_wp_blip_no_remediation(host, teardown):
    pass


@scenario(
    "../features/workload_plane_isolation.feature",
    "A majority Workload Plane outage is not remediated but alerts",
)
def test_majority_outage_alerts(host, teardown):
    pass


# }}}
# Fixtures {{{


@pytest.fixture
def context():
    return {"cut": []}


@pytest.fixture
def teardown(host, context, k8s_client, ssh_config):
    yield

    # Restore Workload Plane connectivity on every node we cut, even on failure.
    for node_name, mode, iface in context["cut"]:
        try:
            _restore_wp(_node_host(node_name, ssh_config), mode, iface)
        except Exception as exc:  # noqa: BLE001 - best-effort cleanup
            utils.LOGGER.warning("Failed to restore WP on %s: %s", node_name, exc)

    # Uncordon any node cordoned to relocate kube-state-metrics.
    for node_name in context.get("cordoned", []):
        try:
            _uncordon(host, node_name)
        except Exception as exc:  # noqa: BLE001 - best-effort cleanup
            utils.LOGGER.warning("Failed to uncordon %s: %s", node_name, exc)

    # Remove the test workload and wait for the namespace to be fully gone, so
    # the next scenario can recreate it (a still-terminating namespace rejects
    # new objects).
    if context.get("workload"):
        ns_client = k8s_client.resources.get(api_version="v1", kind="Namespace")
        try:
            ns_client.delete(
                name=WORKLOAD_NAMESPACE,
                body=kubernetes.client.V1DeleteOptions(propagation_policy="Foreground"),
            )
        except kubernetes.client.rest.ApiException:
            pass

        def _gone():
            try:
                ns_client.get(name=WORKLOAD_NAMESPACE)
            except kubernetes.client.rest.ApiException as exc:
                if exc.status == 404:
                    return
                raise
            raise AssertionError(f"namespace {WORKLOAD_NAMESPACE} still terminating")

        utils.retry(_gone, times=30, wait=5, name=f"delete {WORKLOAD_NAMESPACE}")


# }}}
# Given {{{


@given("we are on a cluster with at least 3 workload-plane nodes")
def at_least_three_nodes(k8s_client):
    nodes = _all_nodes(k8s_client)
    if len(nodes) < 3:
        pytest.skip(
            "Workload Plane isolation tests need at least 3 workload-plane nodes "
            f"(found {len(nodes)})"
        )


@given(parsers.parse("the node-warden '{name}' policy is deployed"))
def policy_is_deployed(k8s_client, name):
    policies = k8s_client.resources.get(
        api_version="warden.scality.com/v1alpha1", kind="NodeRemediationPolicy"
    )

    def _check():
        try:
            policies.get(name=name)
        except kubernetes.client.rest.ApiException as exc:
            if exc.status == 404:
                raise AssertionError(f"NodeRemediationPolicy '{name}' not found")
            raise

    utils.retry(_check, times=10, wait=3, name=f"wait for policy '{name}'")


@given("a test workload is running on every workload-plane node")
def deploy_test_workload(context, k8s_client, utils_image):
    node_names = [node.metadata.name for node in _all_nodes(k8s_client)]

    _create_namespace(k8s_client, WORKLOAD_NAMESPACE)
    context["workload"] = True

    deployment = _workload_deployment(utils_image, replicas=len(node_names))
    k8s_client.resources.get(api_version="apps/v1", kind="Deployment").create(
        body=deployment, namespace=WORKLOAD_NAMESPACE
    )
    k8s_client.resources.get(api_version="v1", kind="Service").create(
        body=_workload_service(), namespace=WORKLOAD_NAMESPACE
    )

    _wait_endpoints_on_nodes(k8s_client, set(node_names))


# }}}
# When {{{


@when("we cut the Workload Plane network on a workload-plane node using '<mode>'")
def cut_wp_single(host, context, k8s_client, ssh_config, mode):
    node_name = _pick_wp_node(k8s_client, ssh_config)
    context["isolated"] = node_name
    # Move kube-state-metrics off the node we isolate so Prometheus keeps
    # scraping it and can compute the alerts.
    _relocate_ksm(host, k8s_client, [node_name], context)
    _cut_wp(context, ssh_config, node_name, mode)


@when(
    parsers.parse(
        "we cut the Workload Plane network on the majority of workload-plane nodes "
        "using '{mode}'"
    )
)
def cut_wp_majority(host, context, k8s_client, ssh_config, mode):
    node_names = [node.metadata.name for node in _all_nodes(k8s_client)]
    prometheus = _prometheus_nodes(k8s_client)
    # Keep one Prometheus node uncut -- a single replica is enough for the alerts
    # to stay computable and queryable while the rest of the plane is isolated.
    keep = next((name for name in node_names if name in prometheus), None)
    assert keep, "No Prometheus node to preserve"
    majority = len(node_names) // 2 + 1
    to_cut = [name for name in node_names if name != keep][:majority]
    # kube-state-metrics must stay reachable from Prometheus: force it onto an
    # uncut node before isolating the majority.
    _relocate_ksm(host, k8s_client, to_cut, context)
    for node_name in to_cut:
        _cut_wp(context, ssh_config, node_name, mode)


@when("we restore the Workload Plane network on the isolated node")
@when("we restore the Workload Plane network on all isolated nodes")
def restore_wp(context, ssh_config):
    for node_name, mode, iface in context["cut"]:
        _restore_wp(_node_host(node_name, ssh_config), mode, iface)
    context["cut"] = []


@when(
    parsers.parse(
        "we cut then restore the Workload Plane network on a workload-plane node "
        "within {seconds:d} seconds"
    )
)
def wp_blip(context, k8s_client, ssh_config, seconds):
    node_name = _pick_wp_node(k8s_client, ssh_config, keep_prometheus=False)
    _cut_wp(context, ssh_config, node_name, "blocked")
    time.sleep(seconds)
    for node_name, mode, iface in context["cut"]:
        _restore_wp(_node_host(node_name, ssh_config), mode, iface)
    context["cut"] = []


# }}}
# Then {{{


@then(parsers.parse("the isolated node reports '{condition}' as '{status}'"))
def isolated_reports_condition(context, k8s_client, condition, status):
    node_name = context["isolated"]

    def _check():
        assert (
            _node_condition(k8s_client, node_name, condition) == status
        ), f"Node {node_name} condition {condition} is not {status}"

    utils.retry(_check, times=18, wait=10, name=f"wait for {condition} on {node_name}")


@then(parsers.parse("no other node reports '{condition}' as '{status}'"))
def no_other_node_condition(context, k8s_client, condition, status):
    isolated = context["isolated"]
    for node in _all_nodes(k8s_client):
        if node.metadata.name == isolated:
            continue
        assert (
            _node_condition(k8s_client, node.metadata.name, condition) != status
        ), f"Unexpected {condition}={status} on node {node.metadata.name}"


@then(parsers.parse("the isolated node gets the '{key}' taint"))
def isolated_gets_taint(context, k8s_client, key):
    node_name = context["isolated"]

    def _check():
        assert _has_taint(
            k8s_client, node_name, key
        ), f"Node {node_name} is not tainted {key}"

    utils.retry(_check, times=18, wait=10, name=f"wait for taint {key} on {node_name}")


@then("the test workload has no endpoint on the isolated node")
def no_endpoint_on_isolated(context, k8s_client):
    node_name = context["isolated"]

    def _check():
        assert node_name not in _endpoint_nodes(
            k8s_client
        ), f"Node {node_name} still serves the test workload"

    utils.retry(
        _check, times=18, wait=10, name=f"wait for {node_name} to leave endpoints"
    )


@then(parsers.parse("the isolated node no longer reports '{condition}' as '{status}'"))
def isolated_condition_cleared(context, k8s_client, condition, status):
    node_name = context["isolated"]

    def _check():
        assert (
            _node_condition(k8s_client, node_name, condition) != status
        ), f"Node {node_name} still reports {condition}={status}"

    utils.retry(
        _check, times=18, wait=10, name=f"wait for {condition} to clear on {node_name}"
    )


@then(parsers.parse("the '{key}' taint is removed from the isolated node"))
def taint_removed(context, k8s_client, key):
    node_name = context["isolated"]

    def _check():
        assert not _has_taint(
            k8s_client, node_name, key
        ), f"Node {node_name} still tainted {key}"

    utils.retry(
        _check, times=18, wait=10, name=f"wait for taint {key} removal on {node_name}"
    )


@then("the test workload has an endpoint on every workload-plane node")
def endpoint_on_every_node(k8s_client):
    node_names = {node.metadata.name for node in _all_nodes(k8s_client)}
    _wait_endpoints_on_nodes(k8s_client, node_names)


@then(
    parsers.parse(
        "no node is tainted and alerts '{alert_names}' do not fire "
        "within {seconds:d} seconds"
    )
)
def no_taint_no_alerts_within(k8s_client, ssh_config, context, alert_names, seconds):
    # One window checking the taint and every listed alert at once, instead of
    # polling each signal for a full window in sequence.
    avoid = {name for name, _, _ in context["cut"]}
    key = "node.scality.com/workload-plane-unreachable"
    names = {name.strip() for name in alert_names.split(",")}
    remaining = seconds
    while remaining > 0:
        tainted = [
            node.metadata.name
            for node in _all_nodes(k8s_client)
            if _has_taint(k8s_client, node.metadata.name, key)
        ]
        assert not tainted, f"Unexpected taint {key} on nodes {tainted}"
        firing = names & _firing_alerts(k8s_client, ssh_config, avoid)
        assert not firing, f"Alerts fired unexpectedly: {sorted(firing)}"
        time.sleep(10)
        remaining -= 10


@then(parsers.parse("the '{alert_name}' alert is firing"))
def alert_is_firing(k8s_client, ssh_config, context, alert_name):
    avoid = {name for name, _, _ in context["cut"]}

    def _check():
        assert alert_name in _firing_alerts(
            k8s_client, ssh_config, avoid
        ), f"Alert {alert_name} is not firing"

    # Firing needs the condition/taint set, a kube-state-metrics scrape and the
    # rule `for` window, so allow a generous budget.
    utils.retry(_check, times=30, wait=10, name=f"wait for alert {alert_name}")


@then(parsers.parse("the '{alert_name}' alert clears"))
def alert_clears(k8s_client, ssh_config, context, alert_name):
    avoid = {name for name, _, _ in context["cut"]}

    def _check():
        assert alert_name not in _firing_alerts(
            k8s_client, ssh_config, avoid
        ), f"Alert {alert_name} is still firing"

    utils.retry(_check, times=30, wait=10, name=f"wait for alert {alert_name} to clear")


@then(parsers.parse("no node reports '{condition}' as '{status}'"))
def no_node_condition(k8s_client, condition, status):
    def _check():
        offenders = [
            node.metadata.name
            for node in _all_nodes(k8s_client)
            if _node_condition(k8s_client, node.metadata.name, condition) == status
        ]
        assert not offenders, f"Nodes still report {condition}={status}: {offenders}"

    utils.retry(
        _check, times=18, wait=10, name=f"wait for {condition} to clear everywhere"
    )


# }}}
# Helpers {{{


def _all_nodes(k8s_client):
    return k8s_client.resources.get(api_version="v1", kind="Node").get().items


def _pick_wp_node(k8s_client, ssh_config, keep_prometheus=True):
    """Pick a workload-plane node to cut, preferring a non-bootstrap one.

    keep_prometheus leaves a Prometheus replica uncut (the isolation flow taints
    the node, which would evict Prometheus); a blip never taints, so it can cut
    any node -- which is what lets the single-node case work.
    """
    bootstrap = utils.get_node_name("bootstrap", ssh_config)
    node_names = [node.metadata.name for node in _all_nodes(k8s_client)]
    if keep_prometheus:
        prometheus = _prometheus_nodes(k8s_client)
        non_prometheus = [name for name in node_names if name not in prometheus]
        if non_prometheus:
            candidates = non_prometheus
        else:
            keep = sorted(prometheus)[0]
            candidates = [name for name in node_names if name != keep]
    else:
        candidates = node_names
    assert candidates, "No workload-plane node available to cut"
    for name in candidates:
        if name != bootstrap:
            return name
    return candidates[0]


def _pod_nodes(k8s_client, label):
    pods = k8s_client.resources.get(api_version="v1", kind="Pod").get(
        namespace="metalk8s-monitoring", label_selector=label
    )
    return {pod.spec.nodeName for pod in pods.items if pod.spec.nodeName}


def _prometheus_nodes(k8s_client):
    return _pod_nodes(k8s_client, "app.kubernetes.io/name=prometheus")


def _ksm_nodes(k8s_client):
    return _pod_nodes(k8s_client, "app.kubernetes.io/name=kube-state-metrics")


def _node_host(node_name, ssh_config):
    assert ssh_config is not None, "This test requires SSH access to the nodes"
    return testinfra.get_host(node_name, ssh_config=ssh_config)


def _node_condition(k8s_client, node_name, condition):
    node = k8s_client.resources.get(api_version="v1", kind="Node").get(name=node_name)
    for cond in node.status.conditions or []:
        if cond.type == condition:
            return cond.status
    return None


def _has_taint(k8s_client, node_name, key):
    node = k8s_client.resources.get(api_version="v1", kind="Node").get(name=node_name)
    return any((taint.key == key) for taint in (node.spec.taints or []))


def _endpoint_nodes(k8s_client):
    """Return the set of node names with a ready endpoint for the test workload."""
    slices = k8s_client.resources.get(
        api_version="discovery.k8s.io/v1", kind="EndpointSlice"
    ).get(
        namespace=WORKLOAD_NAMESPACE,
        label_selector="kubernetes.io/service-name=wp-test-workload",
    )
    nodes = set()
    for endpoint_slice in slices.items:
        for endpoint in endpoint_slice.endpoints or []:
            ready = endpoint.conditions and endpoint.conditions.ready
            if ready and endpoint.nodeName:
                nodes.add(endpoint.nodeName)
    return nodes


def _wait_endpoints_on_nodes(k8s_client, expected_nodes):
    def _check():
        current = _endpoint_nodes(k8s_client)
        assert (
            current == expected_nodes
        ), f"Endpoints {current} do not cover every node {expected_nodes}"

    utils.retry(
        _check, times=30, wait=10, name="wait for workload endpoints on every node"
    )


def _prometheus_endpoint(k8s_client, avoid_nodes):
    """Return (node, pod_ip) for a Prometheus pod on an uncut node: it has been
    able to scrape kube-state-metrics, and its own node can reach the pod IP
    locally without crossing the (possibly cut) Workload Plane."""
    pods = k8s_client.resources.get(api_version="v1", kind="Pod").get(
        namespace="metalk8s-monitoring",
        label_selector="app.kubernetes.io/name=prometheus",
    )
    for pod in pods.items:
        if pod.spec.nodeName not in avoid_nodes and pod.status.podIP:
            return pod.spec.nodeName, pod.status.podIP
    raise AssertionError("No Prometheus pod outside the isolated nodes")


def _firing_alerts(k8s_client, ssh_config, avoid_nodes):
    # Query Prometheus from its own node against the pod IP: node-to-local-pod
    # traffic is not routed over the (possibly cut) Workload Plane, and it needs
    # no shell inside the (distroless) Prometheus pod.
    node_name, pod_ip = _prometheus_endpoint(k8s_client, avoid_nodes)
    node = _node_host(node_name, ssh_config)
    url = f"http://{pod_ip}:9090/api/v1/alerts"
    # Prometheus can briefly answer 503 (starting up, reloading rules); ride it out.
    data = None
    for _ in range(6):
        res = node.run(f"curl -sf --max-time 15 {url}")
        if res.rc == 0:
            try:
                data = json.loads(res.stdout)
                break
            except ValueError:
                pass
        time.sleep(5)
    assert data is not None, f"Prometheus at {pod_ip} did not answer /api/v1/alerts"
    return {
        alert["labels"].get("alertname")
        for alert in data.get("data", {}).get("alerts", [])
        if alert.get("state") == "firing"
    }


def _kubectl(host, args):
    with host.sudo():
        return host.check_output(
            f"kubectl --kubeconfig=/etc/kubernetes/admin.conf {args}"
        )


def _cordon(host, node_name):
    _kubectl(host, f"cordon {node_name}")


def _uncordon(host, node_name):
    _kubectl(host, f"uncordon {node_name}")


def _relocate_ksm(host, k8s_client, cut_nodes, context):
    """Ensure kube-state-metrics runs on a node that stays up, so Prometheus can
    keep scraping it: cordon the nodes about to be cut, delete the pod so it
    reschedules onto an uncut node, then uncordon."""
    cut = set(cut_nodes)
    if _ksm_nodes(k8s_client) - cut:
        return  # already on an uncut node
    for node_name in cut_nodes:
        _cordon(host, node_name)
    context["cordoned"] = list(cut_nodes)
    pods = k8s_client.resources.get(api_version="v1", kind="Pod").get(
        namespace="metalk8s-monitoring",
        label_selector="app.kubernetes.io/name=kube-state-metrics",
    )
    for pod in pods.items:
        _kubectl(host, f"-n metalk8s-monitoring delete pod {pod.metadata.name}")

    def _off_cut():
        assert _ksm_nodes(k8s_client) - cut, "kube-state-metrics still on a cut node"

    utils.retry(_off_cut, times=30, wait=5, name="relocate kube-state-metrics")
    for node_name in cut_nodes:
        _uncordon(host, node_name)
    context["cordoned"] = []


def _wp_iface(node):
    wp_ip = utils.get_grain(node, "metalk8s:workload_plane_ip")
    for iface, ips in utils.get_grain(node, "ip4_interfaces").items():
        if wp_ip in ips:
            return iface
    raise AssertionError(f"Could not find the Workload Plane interface for IP {wp_ip}")


def _cut_wp(context, ssh_config, node_name, mode):
    node = _node_host(node_name, ssh_config)
    iface = _wp_iface(node)
    with node.sudo():
        if mode == "link-down":
            node.check_output(f"ip link set {iface} down")
        elif mode == "blocked":
            # filter-table drops are bypassed by Calico's cali-FORWARD chain, so
            # drop on the raw table to simulate a link-up-but-blocked failure.
            node.check_output(f"iptables -t raw -I PREROUTING -i {iface} -j DROP")
            node.check_output(f"iptables -t raw -I OUTPUT -o {iface} -j DROP")
        else:
            raise ValueError(f"Unknown cut mode '{mode}'")
    context["cut"].append((node_name, mode, iface))


def _restore_wp(node, mode, iface):
    with node.sudo():
        if mode == "link-down":
            node.check_output(f"ip link set {iface} up")
        elif mode == "blocked":
            node.check_output(f"iptables -t raw -D PREROUTING -i {iface} -j DROP")
            node.check_output(f"iptables -t raw -D OUTPUT -o {iface} -j DROP")


def _create_namespace(k8s_client, name):
    ns_client = k8s_client.resources.get(api_version="v1", kind="Namespace")
    try:
        ns_client.get(name=name)
    except kubernetes.client.rest.ApiException as exc:
        if exc.status != 404:
            raise
        ns_client.create(
            body={"apiVersion": "v1", "kind": "Namespace", "metadata": {"name": name}}
        )


def _workload_deployment(image, replicas):
    labels = {"app": "wp-test-workload"}
    return {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {"name": "wp-test-workload", "labels": labels},
        "spec": {
            "replicas": replicas,
            "selector": {"matchLabels": labels},
            "template": {
                "metadata": {"labels": labels},
                "spec": {
                    # One pod per node so isolating a node empties exactly one pod.
                    "affinity": {
                        "podAntiAffinity": {
                            "requiredDuringSchedulingIgnoredDuringExecution": [
                                {
                                    "labelSelector": {"matchLabels": labels},
                                    "topologyKey": "kubernetes.io/hostname",
                                }
                            ]
                        }
                    },
                    # Tolerate control-plane taints so the workload lands on every node.
                    "tolerations": [
                        {
                            "key": f"node-role.kubernetes.io/{role}",
                            "operator": "Exists",
                            "effect": "NoSchedule",
                        }
                        for role in ("bootstrap", "etcd", "infra", "master")
                    ],
                    "containers": [
                        {
                            "name": "workload",
                            "image": image,
                            "command": ["sleep", "infinity"],
                            "ports": [{"containerPort": 8080, "name": "http"}],
                        }
                    ],
                },
            },
        },
    }


def _workload_service():
    return {
        "apiVersion": "v1",
        "kind": "Service",
        "metadata": {"name": "wp-test-workload"},
        "spec": {
            "selector": {"app": "wp-test-workload"},
            "ports": [{"name": "http", "port": 8080, "targetPort": "http"}],
        },
    }


# }}}
