import json

import pytest
from pytest_bdd import scenario, then, parsers

from tests import utils


@scenario(
    "../features/salt_ssh.feature", "salt-ssh state work on every non-bootstrap nodes"
)
def test_salt_ssh_state(host):
    pass


@then(parsers.parse("we are able to run '{state}' using salt-ssh on non-{role} nodes"))
def run_state_salt_ssh(host, k8s_client, ssh_config, version, state, role):
    minions = [
        node.metadata.name
        for node in k8s_client.resources.get(api_version="v1", kind="Node")
        .get(label_selector=f"node-role.kubernetes.io/{role}!=")
        .items
    ]
    command = [
        "salt-ssh",
        "-L",
        ",".join(minions),
        "state.sls",
        state,
        "saltenv=metalk8s-{}".format(version),
        "--out=json",
    ]

    state_outputs = json.loads(utils.run_salt_command(host, command, ssh_config).stdout)

    for minion, ret in state_outputs.items():
        assert isinstance(ret, dict), f"Error on {minion}: {ret}"
        for state_name, state_result in ret.items():
            assert state_result[
                "result"
            ], f"Error on {minion}: state {state_name}: {state_result['comment']}"
