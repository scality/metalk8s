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
@scenario('../features/expansion.feature', 'Add one node to the cluster')
def test_cluster_expansion_1_node(host):
    pass


@scenario('../features/expansion.feature', 'Add a second node to the cluster')
def test_cluster_expansion_2_nodes(host):
    pass

# When {{{

@when(parsers.parse('we declare a new "{node_type}" node on host "{node_name}"'))
def declare_node(
    ssh_config, version, k8s_client, node_type, node_name, bootstrap_config
):
    """Declare the given node in Kubernetes."""
    node_ip = get_node_ip(node_name, ssh_config, bootstrap_config)
    node_manifest = get_node_manifest(
        node_type, version, node_ip, node_name
    )
    k8s_client.create_node(body=node_from_manifest(node_manifest))


@when(parsers.parse('we deploy the node "{node_name}"'))
def deploy_node(host, ssh_config, version, node_name):
    accept_ssh_key = [
        'salt-ssh', '-i', node_name, 'test.ping', '--roster=kubernetes'
    ]
    pillar = {'orchestrate': {'node_name': node_name}}
    deploy = [
        'salt-run', 'state.orchestrate', 'metalk8s.orchestrate.deploy_node',
        'saltenv=metalk8s-{}'.format(version),
        "pillar='{}'".format(json.dumps(pillar))
    ]
    run_salt_command(host, accept_ssh_key, ssh_config)
    run_salt_command(host, deploy, ssh_config)


# }}}
# Then {{{

@then(parsers.parse('node "{node_name}" is registered in Kubernetes'))
def check_node_is_registered(k8s_client, node_name):
    """Check if the given node is registered in Kubernetes."""
    try:
        k8s_client.read_node(node_name)
    except k8s.client.rest.ApiException as exn:
        pytest.fail(str(exn))


@then(parsers.parse('node "{node_name}" status is "{expected_status}"'))
def check_node_status(k8s_client, node_name, expected_status):
    """Check if the given node has the expected status."""
    def _check_node_status():
        try:
            status = k8s_client.read_node_status(node_name).status
        except k8s.client.rest.ApiException as exn:
            raise AssertionError(exn)
        # If really not ready, status may not have been pushed yet.
        if status.conditions is None:
            assert expected_status == 'NotReady'
            return

        for condition in status.conditions:
            if condition.type == 'Ready':
                break
        assert kube_utils.MAP_STATUS[condition.status] == expected_status

    utils.retry(
        _check_node_status,
        times=10, wait=5,
        name="check node '{}' status".format(node_name)
    )


# }}}
# Helpers {{{

def kubectl_exec(
    host,
    command,
    pod,
    kubeconfig='/etc/kubernetes/admin.conf',
    **kwargs
):
    """Grab the return code from a `kubectl exec`"""
    kube_args = ['--kubeconfig', kubeconfig]

    if kwargs.get('container'):
        kube_args.extend(['-c', kwargs.get('container')])
    if kwargs.get('namespace'):
        kube_args.extend(['-n', kwargs.get('namespace')])

    kubectl_cmd_tplt = 'kubectl exec {} {} -- {}'

    with host.sudo():
        output = host.run(
            kubectl_cmd_tplt.format(
                pod,
                ' '.join(kube_args),
                ' '.join(command)
            )
        )
        return output

def get_node_ip(node_name, ssh_config, bootstrap_config):
    """Return the IP of the node `node_name`.
    We have to jump through hoops because `testinfra` does not provide a simple
    way to get this information…
    """
    infra_node = testinfra.get_host(node_name, ssh_config=ssh_config)
    control_plane_cidr = bootstrap_config['networks']['controlPlane']
    return utils.get_ip_from_cidr(infra_node, control_plane_cidr)

def get_node_manifest(node_type, metalk8s_version, node_ip, node_name):
    """Return the YAML to declare a node with the specified IP."""
    filename = '{}-node.yaml.tpl'.format(node_type)
    filepath = (pathlib.Path(__file__)/'..'/'files'/filename).resolve()
    manifest = filepath.read_text(encoding='utf-8')
    return string.Template(manifest).substitute(
        metalk8s_version=metalk8s_version, node_ip=node_ip, node_name=node_name
    )

def node_from_manifest(manifest):
    """Create V1Node object from a YAML manifest."""
    manifest = yaml.safe_load(manifest)
    manifest['api_version'] = manifest.pop('apiVersion')
    return k8s.client.V1Node(**manifest)

def run_salt_command(host, command, ssh_config):
    """Run a command inside the salt-master container."""

    pod = 'salt-master-{}'.format(
        utils.get_node_name('bootstrap', ssh_config)
    )

    output = kubectl_exec(
        host,
        command,
        pod,
        container='salt-master',
        namespace='kube-system'
    )

    assert output.exit_status == 0, \
        'deploy failed with: \nout: {}\nerr:'.format(
            output.stdout,
            output.stderr
        )

# }}}
