import re

import requests
import requests.exceptions

import pytest
from pytest_bdd import scenario, given, then, when, parsers

import kubernetes.client
from kubernetes.client.rest import ApiException

from tests import kube_utils
from tests import utils


# Constants {{{

INGRESS_PORT = 8443

# }}}
# Scenarios {{{


@scenario("../features/authentication.feature", "List Pods")
def test_list_pods(host):
    pass


@scenario("../features/authentication.feature", "Expected Pods")
def test_expected_pods(host):
    pass


@scenario("../features/authentication.feature", "Reach the OpenID Config")
def test_reach_openid_config(host):
    pass


@scenario("../features/authentication.feature", "Access HTTPS service")
def test_access_https_service(host):
    pass


@scenario("../features/authentication.feature", "Login to Dex using incorrect email")
def test_failed_login(host):
    pass


@scenario(
    "../features/authentication.feature",
    "Login to Dex using correct email and password",
)
def test_login(host):
    pass


# }}}
# Fixtures {{{


@pytest.fixture(scope="function")
def context():
    return {}


# }}}
# Given {{{


@given(parsers.parse("the control-plane Ingress path '{path}' is available"))
def check_cp_ingress_pod_and_container(request, host, k8s_client, control_plane_ip):
    ssh_config = request.config.getoption("--ssh-config")
    label = "app.kubernetes.io/instance=ingress-nginx-control-plane"
    namespace = "metalk8s-ingress"

    def _wait_for_ingress_pod_and_container():
        try:
            pods = kube_utils.get_pods(
                k8s_client, ssh_config, label, namespace=namespace
            )
        except Exception as exc:
            pytest.fail("unable to get pods with error: {}".format(exc))

        assert pods, "No pod with label {} found".format(label)

        for pod in pods:
            assert all(
                container.ready == True for container in pod.status.container_statuses
            )

    utils.retry(
        _wait_for_ingress_pod_and_container,
        times=10,
        wait=5,
        name="wait for pod labeled '{}'".format(label),
    )
    # Todo: check the provided path and ensure it does not redirect to the
    # default-backend


# }}}
# When {{{


@when(
    parsers.parse(
        "we perform a request on '{path}' with port '{port}' on control-plane IP"
    )
)
def perform_request(request_retry_session, host, context, control_plane_ip, path, port):
    try:
        context["response"] = request_retry_session.get(
            "https://{ip}:{port}{path}".format(
                ip=control_plane_ip, port=port, path=path
            ),
            verify=False,
        )
    except requests.exceptions.ConnectionError as exc:
        pytest.fail("Failed to access oidc url path with error: {}".format(exc))


# }}}
# Then {{{


@then("we can reach the OIDC openID configuration")
def reach_openid_config(request_retry_session, host, control_plane_ip):
    def _get_openID_config():
        try:
            response = request_retry_session.get(
                "https://{}:{}/oidc/.well-known/openid-configuration".format(
                    control_plane_ip, INGRESS_PORT
                ),
                verify=False,
            )
        except requests.exceptions.ConnectionError as exc:
            pytest.fail(
                "Unable to reach OpenID Configuration with error: {}".format(exc)
            )

        assert response.status_code == 200
        response_body = response.json()
        # check for the existence of  keys[issuer, authorization_endpoint]
        assert "issuer" and "authorization_endpoint" in response_body
        assert response_body.get("issuer") == "https://{}:{}/oidc".format(
            control_plane_ip, INGRESS_PORT
        )
        assert response_body.get(
            "authorization_endpoint"
        ) == "https://{}:{}/oidc/auth".format(control_plane_ip, INGRESS_PORT)

    utils.retry(_get_openID_config, times=10, wait=5)


@then(
    parsers.parse("the server returns '{status_code}' with message '{status_message}'")
)
def server_returns(host, context, status_code, status_message):
    response = context.get("response")
    assert response is not None
    assert response.status_code == int(status_code)
    assert response.text.rstrip("\n") == status_message


#  }}}
