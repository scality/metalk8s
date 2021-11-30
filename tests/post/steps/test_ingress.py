import json
import os
import re
import requests
import requests.exceptions

import pytest
from pytest_bdd import given, parsers, scenario, then, when
import testinfra

from tests import utils


@scenario("../features/ingress.feature", "Access HTTP services")
def test_access_http_services(host):
    pass


@scenario("../features/ingress.feature", "Access HTTPS services")
def test_access_https_services(host):
    pass


@scenario("../features/ingress.feature", "Access HTTP services on control-plane IP")
def test_access_http_services_on_control_plane_ip(host):
    pass


@scenario(
    "../features/ingress.feature", "Failover of Control Plane Ingress VIP using MetalLB"
)
def test_failover_cp_ingress_vip(host, teardown):
    pass


@scenario("../features/ingress.feature", "Change Control Plane Ingress IP to node-1 IP")
def test_change_cp_ingress_ip(host, teardown):
    pass


@scenario("../features/ingress.feature", "Enable MetalLB")
def test_change_cp_ingress_mode(host, teardown):
    pass


@scenario(
    "../features/ingress.feature", "Control Plane Ingress Controller pods spreading"
)
def test_cp_ingress_controller_pod_spreading(host):
    pass


@pytest.fixture(scope="function")
def context():
    return {}


@pytest.fixture
def teardown(context, host, ssh_config, version, k8s_client):
    yield
    if "node_to_uncordon" in context:
        k8s_client.resources.get(api_version="v1", kind="Node").patch(
            name=context["node_to_uncordon"], body={"spec": {"unschedulable": False}}
        )

    if "bootstrap_to_restore" in context:
        with host.sudo():
            host.check_output(
                "cp {} /etc/metalk8s/bootstrap.yaml".format(
                    context["bootstrap_to_restore"]
                )
            )

        re_configure_cp_ingress(host, version, ssh_config)


@given("the node control-plane IP is not equal to its workload-plane IP")
def node_control_plane_ip_is_not_equal_to_its_workload_plane_ip(host):
    data = utils.get_grain(host, "metalk8s")

    assert "control_plane_ip" in data
    assert "workload_plane_ip" in data

    if data["control_plane_ip"] == data["workload_plane_ip"]:
        pytest.skip("Node control-plane IP is equal to node workload-plane IP")


@given("a VIP for Control Plane Ingress is available")
def we_have_a_vip(context):
    cp_ingress_vip = os.environ.get("CONTROL_PLANE_INGRESS_VIP")

    if not cp_ingress_vip:
        pytest.skip("No Control Plane Ingress VIP to switch to")

    context["new_cp_ingress_vip"] = cp_ingress_vip


@given("MetalLB is already enabled")
def metallb_enabled(host):
    metallb_enabled = utils.get_pillar(host, "networks:control_plane:metalLB:enabled")

    if not metallb_enabled:
        pytest.skip("MetalLB is not enabled")


@given("MetalLB is disabled")
def disable_metallb(host, context, ssh_config, version):
    metallb_enabled = utils.get_pillar(host, "networks:control_plane:metalLB:enabled")

    if metallb_enabled:
        bootstrap_patch = {
            "networks": {"controlPlane": {"metalLB": {"enabled": False}, "ingress": {}}}
        }

        patch_bootstrap_config(context, host, bootstrap_patch)
        re_configure_cp_ingress(host, version, ssh_config)


@when(parsers.parse("we perform an {protocol} request on port {port} on a {plane} IP"))
def perform_request(host, context, protocol, port, plane):
    protocols = {
        "HTTP": "http",
        "HTTPS": "https",
    }

    if protocol not in protocols:
        raise NotImplementedError

    grains = {
        "workload-plane": "metalk8s:workload_plane_ip",
        "control-plane": "metalk8s:control_plane_ip",
    }

    if plane not in grains:
        raise NotImplementedError

    ip = utils.get_grain(host, grains[plane])

    try:
        context["response"] = requests.get(
            "{proto}://{ip}:{port}".format(proto=protocols[protocol], ip=ip, port=port),
            verify=False,
        )
    except Exception as exc:
        context["exception"] = exc


@when("we stop the node hosting the Control Plane Ingress VIP")
def stop_cp_ingress_vip_node(context, k8s_client):
    node_name = get_node_hosting_cp_ingress_vip(k8s_client)

    context["cp_ingress_vip_node"] = node_name
    context["node_to_uncordon"] = node_name

    # Cordon node
    k8s_client.resources.get(api_version="v1", kind="Node").patch(
        name=node_name, body={"spec": {"unschedulable": True}}
    )

    pod_k8s_client = k8s_client.resources.get(api_version="v1", kind="Pod")
    # Delete Control Plane Ingress Controller from node
    cp_ingress_pods = pod_k8s_client.get(
        namespace="metalk8s-ingress",
        label_selector="app.kubernetes.io/instance=ingress-nginx-control-plane",
        field_selector="spec.nodeName={}".format(node_name),
    )
    for pod in cp_ingress_pods.items:
        pod_k8s_client.delete(name=pod.metadata.name, namespace=pod.metadata.namespace)


@when(parsers.parse("we set control plane ingress IP to node '{node_name}' IP"))
def update_cp_ingress_ip(host, context, ssh_config, version, node_name):
    node = testinfra.get_host(node_name, ssh_config=ssh_config)
    ip = utils.get_grain(node, "metalk8s:control_plane_ip")

    bootstrap_patch = {"networks": {"controlPlane": {"ingress": {"ip": ip}}}}

    patch_bootstrap_config(context, host, bootstrap_patch)
    re_configure_cp_ingress(host, version, ssh_config)


@when(parsers.parse("we enable MetalLB and set control plane ingress IP to '{ip}'"))
def update_control_plane_ingress_ip(host, context, ssh_config, version, ip):
    ip = ip.format(**context)

    bootstrap_patch = {
        "networks": {
            "controlPlane": {"metalLB": {"enabled": True}, "ingress": {"ip": ip}}
        }
    }

    patch_bootstrap_config(context, host, bootstrap_patch)
    re_configure_cp_ingress(host, version, ssh_config)


@then(
    parsers.re(r"the server returns (?P<status_code>\d+) '(?P<reason>.+)'"),
    converters=dict(status_code=int),
)
def server_returns(host, context, status_code, reason):
    response = context.get("response")
    assert response is not None
    assert response.status_code == int(status_code)
    assert response.reason == reason


@then("the server should not respond")
def server_does_not_respond(host, context):
    assert "exception" in context
    assert isinstance(context["exception"], requests.exceptions.ConnectionError)


@then("the node hosting the Control Plane Ingress VIP changed")
def check_node_hosting_vip_changed(context, k8s_client):
    def _check_node_hosting():
        new_node = get_node_hosting_cp_ingress_vip(k8s_client)
        assert new_node != context["cp_ingress_vip_node"]

    utils.retry(_check_node_hosting, times=10, wait=3)


@then(parsers.parse("the control plane ingress IP is equal to node '{node_name}' IP"))
def check_cp_ingress_node_ip(control_plane_ingress_ip, node_name, ssh_config):
    node = testinfra.get_host(node_name, ssh_config=ssh_config)
    ip = utils.get_grain(node, "metalk8s:control_plane_ip")

    assert control_plane_ingress_ip == ip


@then(parsers.parse("the control plane ingress IP is equal to '{ip}'"))
def check_cp_ingress_ip(context, control_plane_ingress_ip, ip):
    ip = ip.format(**context)
    assert control_plane_ingress_ip == ip


def get_node_hosting_cp_ingress_vip(k8s_client):
    # To get the node where sit the VIP we need to look at event on the Service
    field_selectors = [
        "reason=nodeAssigned",
        "involvedObject.kind=Service",
        "involvedObject.name=ingress-nginx-control-plane-controller",
    ]
    events = k8s_client.resources.get(api_version="v1", kind="Event").get(
        namespace="metalk8s-ingress",
        field_selector=",".join(field_selectors),
    )

    assert events.items, "Unable to get event for Control Plane Ingress Service"

    match = None
    for event in sorted(
        events.items, key=lambda event: event.lastTimestamp, reverse=True
    ):
        match = re.search(r'announcing from node "(?P<node>.+)"', event.message)
        if match is not None:
            break

    assert match, "Unable to get the node hosting the Control Plane Ingress VIP"

    return match.group("node")


def patch_bootstrap_config(context, host, patch):
    if "bootstrap_to_restore" not in context:
        with host.sudo():
            cmd_ret = host.check_output("salt-call --out json --local temp.dir")

        tmp_dir = json.loads(cmd_ret)["local"]

        with host.sudo():
            host.check_output("cp /etc/metalk8s/bootstrap.yaml {}".format(tmp_dir))

        context["bootstrap_to_restore"] = os.path.join(tmp_dir, "bootstrap.yaml")

    with host.sudo():
        host.check_output(
            "salt-call --local --retcode-passthrough state.single "
            "file.serialize /etc/metalk8s/bootstrap.yaml "
            "dataset='{}' "
            "merge_if_exists=True".format(json.dumps(patch))
        )


def re_configure_cp_ingress(host, version, ssh_config):
    with host.sudo():
        host.check_output(
            "salt-call --retcode-passthrough state.sls "
            "metalk8s.kubernetes.apiserver saltenv=metalk8s-{}".format(version)
        )

    command = [
        "salt-run",
        "state.orchestrate",
        "metalk8s.orchestrate.update-control-plane-ingress-ip",
        "saltenv=metalk8s-{}".format(version),
    ]

    utils.run_salt_command(host, command, ssh_config)
