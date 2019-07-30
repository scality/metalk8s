from kubernetes.client import VersionApi
from pytest_bdd import scenario, then

from tests import versions


# Scenarios
@scenario('../features/versions.feature',
          "Check the cluster's Kubernetes version")
def test_cluster_version(host):
    pass


# Then
@then('the Kubernetes version deployed is the same as the configured one')
def check_kubernetes_version(k8s_apiclient):
    # NOTE: the `vX.Y.Z` format is used by Kubernetes, not our buildchain
    configured_version = 'v{}'.format(versions.K8S_VERSION)

    k8s_client = VersionApi(api_client=k8s_apiclient)
    observed_version = k8s_client.get_code().git_version

    assert configured_version == observed_version, (
        "The running version of Kubernetes is '{}', while the expected version"
        "is '{}'.".format(observed_version, configured_version)
    )
