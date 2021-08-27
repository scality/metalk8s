import json
import pathlib
import string

import pytest
from pytest_bdd import scenario, then, parsers, when
import testinfra
import kubernetes as k8s
import yaml

from tests import kube_utils
from tests import utils

# Scenarios
@scenario("../features/expansion.feature", "Add one node to the cluster")
def test_cluster_expansion_1_node(host):
    pass


@scenario("../features/expansion.feature", "Add a second node to the cluster")
def test_cluster_expansion_2_nodes(host):
    pass


# When {{{


@when(parsers.parse('we declare a new "{node_type}" node on host "{node_name}"'))
def declare_node(host, ssh_config, version, k8s_client, node_type, node_name):
    """Declare the given node in Kubernetes."""
    node_ip = get_node_ip(host, node_name, ssh_config)
    node_manifest = get_node_manifest(node_type, version, node_ip, node_name)
    k8s_client.resources.get(api_version="v1", kind="Node").create(
        body=node_from_manifest(node_manifest)
    )


@when(parsers.parse('we deploy the node "{node_name}"'))
def deploy_node(host, ssh_config, version, node_name):
    test_ssh = [
        "salt-ssh",
        "--roster=kubernetes",
        "-i",
        node_name,
        "--raw-shell",
        "--out=json",
        "echo OK",
    ]
    test_ssh_ret = json.loads(
        utils.run_salt_command(host, test_ssh, ssh_config).stdout
    )[node_name]
    assert (
        test_ssh_ret["stdout"] == "OK\n"
    ), "Unable to connect to {} with salt-ssh: {}".format(
        node_name, test_ssh_ret["stderr"]
    )

    pillar = {"orchestrate": {"node_name": node_name}}
    deploy = [
        "salt-run",
        "state.orchestrate",
        "metalk8s.orchestrate.deploy_node",
        "saltenv=metalk8s-{}".format(version),
        "pillar='{}'".format(json.dumps(pillar)),
    ]
    utils.run_salt_command(host, deploy, ssh_config)


# }}}
# Then {{{


@then(parsers.parse('node "{node_name}" is registered in Kubernetes'))
def check_node_is_registered(k8s_client, node_name):
    """Check if the given node is registered in Kubernetes."""
    try:
        k8s_client.resources.get(api_version="v1", kind="Node").get(name=node_name)
    except k8s.client.rest.ApiException as exn:
        pytest.fail(str(exn))


@then(parsers.parse('node "{node_name}" status is "{expected_status}"'))
def check_node_status(k8s_client, node_name, expected_status):
    """Check if the given node has the expected status."""

    def _check_node_status():
        try:
            status = (
                k8s_client.resources.get(api_version="v1", kind="Node")
                .get(name=node_name)
                .status
            )
        except k8s.client.rest.ApiException as exn:
            raise AssertionError(exn)
        # If really not ready, status may not have been pushed yet.
        if status.conditions is None:
            assert expected_status == "NotReady"
            return

        for condition in status.conditions:
            if condition.type == "Ready":
                break
        assert kube_utils.MAP_STATUS[condition.status] == expected_status

    utils.retry(
        _check_node_status,
        times=10,
        wait=5,
        name="check node '{}' status".format(node_name),
    )


# }}}
# Helpers {{{


def get_node_ip(host, node_name, ssh_config):
    """Return the IP of the node `node_name`.
    We have to jump through hoops because `testinfra` does not provide a simple
    way to get this information…
    """
    infra_node = testinfra.get_host(node_name, ssh_config=ssh_config)
    control_plane_cidrs = utils.get_pillar(host, "networks:control_plane:cidr")
    # Consider we have only one CIDR for control plane in this tests
    return utils.get_ip_from_cidr(infra_node, control_plane_cidrs[0])


def get_node_manifest(node_type, metalk8s_version, node_ip, node_name):
    """Return the YAML to declare a node with the specified IP."""
    filename = "{}-node.yaml.tpl".format(node_type)
    filepath = (pathlib.Path(__file__) / ".." / "files" / filename).resolve()
    manifest = filepath.read_text(encoding="utf-8")
    return string.Template(manifest).substitute(
        metalk8s_version=metalk8s_version, node_ip=node_ip, node_name=node_name
    )


def node_from_manifest(manifest):
    """Create V1Node object from a YAML manifest."""
    manifest = yaml.safe_load(manifest)
    manifest["api_version"] = manifest.pop("apiVersion")
    return k8s.client.V1Node(**manifest)


# }}}
