import json
import os
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


@scenario("../features/ingress.feature", "Change Control Plane Ingress IP to node-1 IP")
def test_change_cp_ingress_ip(host, teardown):
    pass


@pytest.fixture(scope="function")
def context():
    return {}


@pytest.fixture
def teardown(context, host, ssh_config, version):
    yield
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


@when(parsers.parse("we update control plane ingress IP to node '{node_name}' IP"))
def update_cp_ingress_ip(host, context, ssh_config, version, node_name):
    node = testinfra.get_host(node_name, ssh_config=ssh_config)
    ip = utils.get_grain(node, "metalk8s:control_plane_ip")

    bootstrap_patch = {"networks": {"controlPlane": {"ingress": {"ip": ip}}}}

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


@then(parsers.parse("the control plane ingress IP is equal to node '{node_name}' IP"))
def check_cp_ingress_node_ip(control_plane_ingress_ip, node_name, ssh_config):
    node = testinfra.get_host(node_name, ssh_config=ssh_config)
    ip = utils.get_grain(node, "metalk8s:control_plane_ip")

    assert control_plane_ingress_ip == ip


def patch_bootstrap_config(context, host, patch):
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
