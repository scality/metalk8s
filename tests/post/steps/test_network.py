import json

import pytest
from pytest_bdd import given, scenario, then

from tests import utils


@scenario("../features/network.feature", "All expected listening processes")
def test_all_listening_processes(host):
    pass


@given("we run on an untainted single node")
def running_on_single_node_untainted(k8s_client):
    nodes = k8s_client.list_node()

    if len(nodes.items) != 1:
        pytest.skip("We skip multi nodes clusters for this test")

    assert not nodes.items[0].spec.taints, "Single node should be untainted"


@then("ports check succeed")
def check_ports(host, ssh_config):
    with host.sudo():
        ret = host.run(
            "salt-call metalk8s_checks.ports",
        )
    assert ret.rc == 0, ret.stderr or ret.stdout


@then("we have only expected processes listening")
def check_all_listening_process(host, version):
    # List of knwon listening process
    ignored_listening_processes = [
        22,  # sshd
        111,  # rpcbind
        "127.0.0.1:25",  # smtp
    ]

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

            # One of the key already part of expected listening processes
            if any(key in expected_listening_processes for key in keys):
                continue

            # Ignore some known listening process
            if any(key in ignored_listening_processes for key in keys):
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
