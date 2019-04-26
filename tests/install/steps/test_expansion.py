import json
import pathlib
import string

import pytest
from pytest_bdd import scenario, then, parsers, when
import testinfra
import kubernetes as k8s
import yaml

from tests import utils

# Scenarios
@scenario('../features/expansion.feature',
          'Add one node to the cluster',
          strict_gherkin=False)
def test_cluster_expansion(host):
    pass

# When {{{

@when(parsers.parse('we declare a new node on host "{hostname}"'))
def declare_node(
    request, version, k8s_client, hostname, bootstrap_config
):
    """Declare the given node in Kubernetes."""
    ssh_config = request.config.getoption('--ssh-config')
    node_ip = get_node_ip(hostname, ssh_config, bootstrap_config)
    node_manifest = get_node_manifest(node_type, version, node_ip)
    k8s_client.create_node(body=node_from_manifest(node_manifest))


@when(parsers.parse('we deploy the node "{name}"'))
def deploy_node(version, k8s_client, name):
    accept_ssh_key = [
        'salt-ssh', '-i', name, 'test.ping', '--roster=kubernetes'
    ]
    pillar = {'orchestrate': {'node_name': name}}
    deploy = [
        'salt-run', 'state.orchestrate', 'metalk8s.orchestrate.deploy_node',
        'saltenv=metalk8s-{}'.format(version),
        'pillar={}'.format(json.dumps(pillar))
    ]
    run_salt_command(k8s_client, accept_ssh_key)
    run_salt_command(k8s_client, deploy)


# }}}
# Then {{{

@then(parsers.parse('node "{hostname}" is registered in Kubernetes'))
def check_node_is_registered(k8s_client, hostname):
    """Check if the given node is registered in Kubernetes."""
    try:
        k8s_client.read_node(hostname)
    except k8s.client.rest.ApiException as exn:
        pytest.fail(str(exn))


# }}}
# Helpers {{{

def get_node_ip(hostname, ssh_config, bootstrap_config):
    """Return the IP of the node `hostname`.
    We have to jump through hoops because `testinfra` does not provide a simple
    way to get this information…
    """
    infra_node = testinfra.get_host(hostname, ssh_config=ssh_config)
    control_plane_cidr = bootstrap_config['networks']['controlPlane']
    return utils.get_ip_from_cidr(infra_node, control_plane_cidr)

def get_node_manifest(metalk8s_version, node_ip):
    """Return the YAML to declare a node with the specified IP."""
    filepath = (pathlib.Path(__file__)/'..'/'files'/'node.yaml.tpl').resolve()
    manifest = filepath.read_text(encoding='utf-8')
    return string.Template(manifest).substitute(
        metalk8s_version=metalk8s_version, node_ip=node_ip
    )

def node_from_manifest(manifest):
    """Create V1Node object from a YAML manifest."""
    manifest = yaml.safe_load(manifest)
    manifest['api_version'] = manifest.pop('apiVersion')
    return k8s.client.V1Node(**manifest)

def run_salt_command(k8s_client, command):
    """Run a command inside the salt-master container."""
    stderr = k8s.stream.stream(
        k8s_client.connect_get_namespaced_pod_exec,
        name='salt-master-bootstrap', namespace='kube-system',
        container='salt-master',
        command=command,
        stderr=True, stdin=False, stdout=False, tty=False
    )
    assert not stderr, 'deploy failed with {}'.format(stderr)

# }}}
