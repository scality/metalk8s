from pytest_bdd import scenario, then

from tests import versions


# Scenarios
@scenario("../features/versions.feature", "Check the cluster's Kubernetes version")
def test_cluster_version(host):
    pass


# Then
@then("the Kubernetes version deployed is the same as the configured one")
def check_kubernetes_version(k8s_client):
    # NOTE: the `vX.Y.Z` format is used by Kubernetes, not our buildchain
    configured_version = "v{}".format(versions.K8S_VERSION)

    observed_version = k8s_client.version["kubernetes"]["gitVersion"]

    assert configured_version == observed_version, (
        "The running version of Kubernetes is '{}', while the expected version"
        "is '{}'.".format(observed_version, configured_version)
    )
