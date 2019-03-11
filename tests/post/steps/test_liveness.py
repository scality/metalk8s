import pytest
from pytest_bdd import scenario, given, when, then, parsers

# Scenarios
@scenario('../features/pods_alive.feature', 'get pods')
def test_pods(host):
    pass

# Given

@given("The kubernetes api is available")
def check_service(host):
   with host.sudo():
       cmd = "kubectl --kubeconfig=/etc/kubernetes/admin.conf cluster-info"
       retcode = host.run(cmd).rc
       assert retcode == 0


# Then
@then(parsers.parse("the '{resource}' list should not be empty in the '{namespace}' namespace"))
def check_resource_list(host, resource, namespace):
    with host.sudo():
        cmd = ("kubectl --kubeconfig=/etc/kubernetes/admin.conf"
               " get {0} --namespace {1} -o custom-columns=:metadata.name")
        cmd_res = host.check_output(cmd.format(resource, namespace))
    assert len(cmd_res.strip()) > 0, 'No {0} found in namespace {1}'.format(
            resource, namespace)
