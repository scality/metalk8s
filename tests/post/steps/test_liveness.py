import pytest
from pytest_bdd import scenario, given, when, then, parsers

# Scenarios
@scenario('../features/pods_alive.feature', 'List Pods')
def test_list_pods(host):
    pass

@scenario('../features/pods_alive.feature', 'Exec in Pods')
def test_exec_in_pods(host):
    pass

# Given

@given("the Kubernetes API is available")
def check_service(host):
   with host.sudo():
       cmd = "kubectl --kubeconfig=/etc/kubernetes/admin.conf cluster-info"
       host.check_output(cmd)


# Then
@then(parsers.parse("the '{resource}' list should not be empty in the '{namespace}' namespace"))
def check_resource_list(host, resource, namespace):
    with host.sudo():
        cmd = ("kubectl --kubeconfig=/etc/kubernetes/admin.conf"
               " get {0} --namespace {1} -o custom-columns=:metadata.name")
        cmd_res = host.check_output(cmd.format(resource, namespace))
    assert len(cmd_res.strip()) > 0, 'No {0} found in namespace {1}'.format(
            resource, namespace)

@then(parsers.parse(
    "we can exec '{command}' in the '{pod}' pod in the '{namespace}' namespace"))
def check_exec(host, command, pod, namespace):
    cmd = ' '.join([
        'kubectl',
        '--kubeconfig=/etc/kubernetes/admin.conf',
        'exec',
        '--namespace {0}'.format(namespace),
        pod,
        command,
    ])

    with host.sudo():
        host.check_output(cmd)
