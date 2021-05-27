import json
import os
import os.path

import pytest
from pytest_bdd import given, when, scenario, then, parsers
import testinfra

from tests import kube_utils, utils

# Fixture {{{


@pytest.fixture(scope="function")
def context():
    return {}


@pytest.fixture
def teardown(context):
    yield
    if "repo_to_restore" in context:
        for host, filename in context["repo_to_restore"].items():
            with host.sudo():
                host.check_output(
                    "mv {} /etc/kubernetes/manifests/repositories.yaml".format(filename)
                )

    if "file_to_remove" in context:
        for host, filename in context["file_to_remove"].items():
            with host.sudo():
                host.check_output("rm -f {}".format(filename))


# }}}
# Scenario {{{


@scenario("../features/registry.feature", "Pull container image from registry")
def test_pull_registry(host):
    pass


@scenario("../features/registry.feature", "Pull container image from registry (HA)")
def test_pull_registry_ha(host, teardown):
    pass


# }}}
# Given {{{


@given("we are on a multi node cluster")
def check_multi_node(k8s_client):
    nodes = k8s_client.list_node()

    if len(nodes.items) == 1:
        pytest.skip("We skip single node cluster for this test")


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


@when(parsers.parse("we set up repositories on '{node_name}'"))
def set_up_repo(context, host, ssh_config, version, node_name):
    node = testinfra.get_host(node_name, ssh_config=ssh_config)
    bootstrap = testinfra.get_host("bootstrap", ssh_config=ssh_config)

    with bootstrap.sudo():
        cmd_ret = bootstrap.run("ls /etc/metalk8s/solutions.yaml")

    with node.sudo():
        node.check_output(
            "salt-call --retcode-passthrough state.sls "
            "metalk8s.archives.mounted "
            "saltenv=metalk8s-{}".format(version)
        )

        # Only run solution state if we have some solutions
        if cmd_ret.rc == 0:
            node.check_output(
                "salt-call --retcode-passthrough state.sls "
                "metalk8s.solutions.available "
                "saltenv=metalk8s-{}".format(version)
            )

        node.check_output(
            "salt-call --retcode-passthrough state.sls "
            "metalk8s.repo.installed "
            "saltenv=metalk8s-{}".format(version)
        )

    command = [
        "salt",
        "'*'",
        "state.sls",
        "metalk8s.container-engine",
        "saltenv=metalk8s-{}".format(version),
    ]

    utils.run_salt_command(host, command, ssh_config)

    context.setdefault("file_to_remove", {})[
        node
    ] = "/etc/kubernetes/manifests/repositories.yaml"


@when(parsers.parse("we stop repositories on node '{node_name}'"))
def stop_repo_pod(context, ssh_config, k8s_client, node_name):
    node = testinfra.get_host(node_name, ssh_config=ssh_config)

    with node.sudo():
        cmd_ret = node.check_output("salt-call --out json --local temp.dir")

    tmp_dir = json.loads(cmd_ret)["local"]

    with node.sudo():
        node.check_output(
            "mv /etc/kubernetes/manifests/repositories.yaml {}".format(tmp_dir)
        )

    context.setdefault("repo_to_restore", {})[node] = os.path.join(
        tmp_dir, "repositories.yaml"
    )

    def _wait_repo_stopped():
        pods = kube_utils.get_pods(
            k8s_client,
            ssh_config,
            "app.kubernetes.io/name=repositories",
            node_name,
            namespace="kube-system",
        )
        assert not pods

    utils.retry(_wait_repo_stopped, times=24, wait=5)


# }}}
# Then {{{


@then("pull succeeds")
def pull_succeeds(context):
    assert context["pull_ret"].rc == 0, "cmd: {}\nstdout:{}\nstderr:{}".format(
        context["pull_ret"].command,
        context["pull_ret"].stdout,
        context["pull_ret"].stderr,
    )


@then("pull fails")
def pull_fails(context):
    assert context["pull_ret"].rc == 1, "cmd: {}\nstdout:{}\nstderr:{}".format(
        context["pull_ret"].command,
        context["pull_ret"].stdout,
        context["pull_ret"].stderr,
    )


# }}}
