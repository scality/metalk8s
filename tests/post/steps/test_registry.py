import pytest
from pytest_bdd import when, scenario, then, parsers
import testinfra

from tests import utils

# Fixture {{{


@pytest.fixture(scope="function")
def context():
    return {}


# }}}
# Scenario {{{


@scenario("../features/registry.feature", "Pull container image from registry")
def test_pull_registry(host):
    pass


@scenario("../features/registry.feature", "We can reach registry from a container")
def test_get_registry_from_container(host):
    pass


# }}}
# When {{{


@when(parsers.parse("we pull metalk8s utils image from node '{node_name}'"))
def pull_metalk8s_utils(host, context, ssh_config, utils_image, node_name):
    if ssh_config:
        node = testinfra.get_host(node_name, ssh_config=ssh_config)
    else:
        node = host

    with node.sudo():
        context["pull_ret"] = node.run("crictl pull {}".format(utils_image))


# }}}
# Then {{{


@then("pull succeeds")
def pull_succeeds(context):
    assert context["pull_ret"].rc == 0, "cmd: {}\nstdout:{}\nstderr:{}".format(
        context["pull_ret"].command,
        context["pull_ret"].stdout,
        context["pull_ret"].stderr,
    )


@then("we can reach registry from inside a container")
def reach_registry(utils_pod, host, registry_address):
    output = utils.kubectl_exec(
        host=host, pod=utils_pod, command=["curl", "--fail", registry_address]
    )

    assert output.exit_status == 0, (
        f"Unable to reach '{registry_address}' from container:"
        f"\nout: {output.stdout}\nerr: {output.stderr}"
    )


# }}}
