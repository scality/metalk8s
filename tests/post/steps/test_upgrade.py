from pytest_bdd import scenario, given, when, then

VERSION_APPLIED_ANNOTATION = "metalk8s.scality.com/version-applied"


# Scenarios
@scenario("../features/upgrade.feature", "Upgrade to the installed version")
def test_upgrade(host):
    pass


# Given
@given("every node completed the installed version")
def check_nodes_version_applied(k8s_client, version):
    nodes = k8s_client.resources.get(api_version="v1", kind="Node").get()
    not_applied = {
        node.metadata.name: (node.metadata.annotations or {}).get(
            VERSION_APPLIED_ANNOTATION
        )
        for node in nodes.items
        if (node.metadata.annotations or {}).get(VERSION_APPLIED_ANNOTATION) != version
    }
    assert not not_applied, f"Nodes that did not complete {version}: {not_applied}"


# When
@when("we run the upgrade to the installed version")
def run_upgrade(request, host):
    iso_root = request.config.getoption("--iso-root")
    cmd = str(iso_root / "upgrade.sh")
    with host.sudo():
        res = host.run(cmd)
        assert res.rc == 0, res.stdout


# Then
@then("no node is unschedulable")
def check_nodes_schedulable(k8s_client):
    nodes = k8s_client.resources.get(api_version="v1", kind="Node").get()
    unschedulable = [
        node.metadata.name for node in nodes.items if node.spec.unschedulable
    ]
    assert not unschedulable, f"Nodes left unschedulable: {unschedulable}"
