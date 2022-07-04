import json
import requests

import pytest
from pytest_bdd import given, scenario, when, then, parsers

from tests import utils, kube_utils


@scenario("../features/network.feature", "All expected listening processes")
def test_all_listening_processes(host):
    pass


@scenario("../features/network.feature", "Access using NodePort on workload-plane IP")
def test_access_nodeport_wp(host, teardown):
    pass


@scenario("../features/network.feature", "Access using NodePort on control-plane IP")
def test_access_nodeport_cp(host, teardown):
    pass


@scenario("../features/network.feature", "Expose NodePort on Control Plane")
def test_change_nodeport_cidrs(host, teardown):
    pass


@pytest.fixture(scope="function")
def context():
    return {}


@pytest.fixture
def teardown(context, host, ssh_config, version, k8s_client):
    yield
    for svc_name in context.get("svc_to_delete", []):
        k8s_client.resources.get(api_version="v1", kind="Pod").delete(
            name=f"{svc_name}-pod", namespace="default"
        )
        k8s_client.resources.get(api_version="v1", kind="Service").delete(
            name=svc_name, namespace="default"
        )

    if "bootstrap_to_restore" in context:
        with host.sudo():
            host.check_output(
                "cp {} /etc/metalk8s/bootstrap.yaml".format(
                    context["bootstrap_to_restore"]
                )
            )

    if context.get("reconfigure_nodeport"):
        re_configure_nodeport(host, version, ssh_config)


@given("we run on an untainted single node")
def running_on_single_node_untainted(k8s_client):
    nodes = k8s_client.resources.get(api_version="v1", kind="Node").get()

    if len(nodes.items) != 1:
        pytest.skip("We skip multi nodes clusters for this test")

    assert not nodes.items[0].spec.taints, "Single node should be untainted"


@when(
    parsers.parse("we create a '{svc_name}' NodePort service that expose a simple pod")
)
def create_nodeport_svc(context, k8s_client, utils_manifest, svc_name):
    utils_manifest["metadata"]["name"] = f"{svc_name}-pod"
    utils_manifest["metadata"]["labels"] = {"app": f"{svc_name}-app"}
    utils_manifest["spec"]["containers"][0]["command"] = [
        "python3",
        "-m",
        "http.server",
        "8080",
    ]

    svc_manifest = {
        "apiVersion": "v1",
        "kind": "Service",
        "metadata": {"name": svc_name},
        "spec": {
            "type": "NodePort",
            "selector": {"app": f"{svc_name}-app"},
            "ports": [{"port": 8080}],
        },
    }

    context.setdefault("svc_to_delete", []).append(svc_name)

    k8s_client.resources.get(api_version="v1", kind="Pod").create(
        body=utils_manifest, namespace="default"
    )
    k8s_client.resources.get(api_version="v1", kind="Service").create(
        body=svc_manifest, namespace="default"
    )

    utils.retry(
        kube_utils.check_pod_status(
            k8s_client,
            f"{svc_name}-pod",
            namespace="default",
            state="Running",
        ),
        times=10,
        wait=3,
        name=f"wait for Pod 'default/{svc_name}-pod'",
    )


@when(parsers.parse("we set nodeport CIDRs to {plane} CIDR"))
def update_nodeport_cidr(host, context, ssh_config, version, plane):
    pillar = {
        "workload-plane": "networks:workload_plane:cidr",
        "control-plane": "networks:control_plane:cidr",
    }

    new_cidrs = utils.get_pillar(host, pillar[plane])

    bootstrap_patch = {"networks": {"nodeport": {"cidr": new_cidrs}}}

    utils.patch_bootstrap_config(context, host, bootstrap_patch)
    re_configure_nodeport(host, version, ssh_config, context=context)


@then("ports check succeed")
def check_ports(host, ssh_config):
    with host.sudo():
        ret = host.run(
            "salt-call metalk8s_checks.ports",
        )
    assert ret.rc == 0, ret.stderr or ret.stdout


@then("we have only expected processes listening")
def check_all_listening_process(host, version, control_plane_ingress_ip):
    # List of knwon listening process
    ignored_listening_processes = [
        22,  # sshd
        111,  # rpcbind
        "127.0.0.1:25",  # smtp
    ]
    # We ignore this range as this one is dynamically assigned
    # for example for loadbalancer service node port
    service_node_port_range = range(30000, 32767)

    # Get all listening process
    with host.sudo():
        ret = host.run("salt-call --out=json metalk8s_network.get_listening_processes")

    assert ret.rc == 0, ret.stderr or ret.stdout

    listening_processes = json.loads(ret.stdout)["local"]

    # Get all expected listening process
    with host.sudo():
        ret = host.run(
            "salt-call --out=json metalk8s.get_from_map networks "
            "saltenv='metalk8s-{}'".format(version)
        )
    assert ret.rc == 0, ret.stderr or ret.stdout

    listening_per_role = json.loads(ret.stdout)["local"]["listening_process_per_role"]

    roles = utils.get_pillar(
        host, "metalk8s:nodes:{}:roles".format(utils.get_grain(host, "id"))
    )

    # All minions are considered as "node"
    if "node" not in roles:
        roles.append("node")

    grain_ips = utils.get_grain(host, "metalk8s")

    assert "control_plane_ip" in grain_ips
    assert "workload_plane_ip" in grain_ips

    expected_listening_processes = {}
    for role in roles:
        expected_listening_processes.update(listening_per_role.get(role) or {})

    errors = []

    # Checking that the list from `expected_listening_processes` is exhaustive
    # NOTE: We do NOT need to check that processes match what is in
    # `expected_listening_processes` as we already called the check right before
    for port, infos in listening_processes.items():
        for ip, process in infos.items():
            # Key in expected listening process could be
            # - an address (`<ip>:<port>`)
            # - a port (string or int)
            keys = [int(port), str(port), "{}:{}".format(ip, port)]

            # - specific address for control plane or workload plane ip
            #   `control_plane_ip:<port>` or `workload_plane_ip:<port>`
            if ip == grain_ips["control_plane_ip"]:
                keys.append("{}:{}".format("control_plane_ip", port))
            if ip == grain_ips["workload_plane_ip"]:
                keys.append("{}:{}".format("workload_plane_ip", port))
            if ip == control_plane_ingress_ip:
                keys.append("{}:{}".format("ingress_control_plane_ip", port))

            # One of the key already part of expected listening processes
            if any(key in expected_listening_processes for key in keys):
                continue

            # Ignore some known listening process
            if any(key in ignored_listening_processes for key in keys):
                continue

            # Ignore service node port range if process name is "kube-proxy"
            if int(port) in service_node_port_range and process["name"] == "kube-proxy":
                continue

            # NOTE: Special case for containerd which uses a "random" port
            if ip == "127.0.0.1" and process["name"] == "containerd":
                continue

            errors.append(
                "Process '{}' (PID: {}) listen on {}:{}".format(
                    process["name"], process["pid"], ip, port
                )
            )

    assert not errors, "\n".join(errors)


@then(
    parsers.parse(
        "a request on the '{svc_name}' NodePort on a {plane} IP returns {status_code}"
    )
)
def nodeport_service_request_return(k8s_client, host, svc_name, plane, status_code):
    response = do_nodeport_service_request(k8s_client, host, plane, svc_name)
    assert response is not None
    assert response.status_code == int(status_code)


@then(
    parsers.parse(
        "a request on the '{svc_name}' NodePort on a {plane} IP should not return"
    )
)
def nodeport_service_request_does_not_respond(k8s_client, host, svc_name, plane):
    try:
        response = do_nodeport_service_request(k8s_client, host, plane, svc_name)
        assert (
            False
        ), f"Server should not answer but got {response.status_code}: {response.reason}"
    except:
        pass


def do_nodeport_service_request(k8s_client, host, plane, svc_name):
    grains = {
        "workload-plane": "metalk8s:workload_plane_ip",
        "control-plane": "metalk8s:control_plane_ip",
    }

    if plane not in grains:
        raise NotImplementedError

    ip = utils.get_grain(host, grains[plane])

    svc = k8s_client.resources.get(api_version="v1", kind="Service").get(
        name=svc_name, namespace="default"
    )
    port = svc["spec"]["ports"][0]["nodePort"]

    return requests.get(f"http://{ip}:{port}")


def re_configure_nodeport(host, version, ssh_config, context=None):
    command = [
        "salt-run",
        "state.sls",
        "metalk8s.kubernetes.kube-proxy.deployed",
        f"saltenv=metalk8s-{version}",
    ]

    utils.run_salt_command(host, command, ssh_config)

    if context is not None:
        context["reconfigure_nodeport"] = True
