import re

import requests
import requests.exceptions

import pytest
from pytest_bdd import scenario, given, then, when, parsers

import kubernetes.client
from kubernetes.client.rest import ApiException

from tests import kube_utils
from tests import utils


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


@scenario(
    "../features/authentication.feature",
    "kube-apiserver rejects anonymous requests",
)
def test_apiserver_rejects_anonymous(host):
    pass


@scenario(
    "../features/authentication.feature",
    "kube-apiserver allows anonymous access to <path>",
    example_converters={"path": str},
)
def test_apiserver_allows_anonymous_health(host):
    pass


@scenario(
    "../features/authentication.feature",
    "kube-apiserver accepts authenticated access to <path>",
    example_converters={"path": str},
)
def test_apiserver_accepts_authenticated_health(host):
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
                container.ready == True for container in pod.status.containerStatuses
            )

    utils.retry(
        _wait_for_ingress_pod_and_container,
        times=24,
        wait=5,
        name="wait for pod labeled '{}'".format(label),
    )
    # Todo: check the provided path and ensure it does not redirect to the
    # default-backend


# }}}
# When {{{


@when(parsers.parse("we perform a request on '{path}' on control-plane Ingress"))
def perform_request(host, context, control_plane_ingress_ep, path):
    session = utils.requests_retry_session()
    try:
        context["response"] = session.get(
            "{ingress_ep}{path}".format(ingress_ep=control_plane_ingress_ep, path=path),
            verify=False,
        )
    except requests.exceptions.ConnectionError as exc:
        pytest.fail("Failed to access oidc url path with error: {}".format(exc))


@when("we perform an anonymous request on the API server '<path>' endpoint")
def perform_anonymous_apiserver_request(context, control_plane_ip, path):
    """Hit kube-apiserver directly on :6443 with no credentials.

    Bypasses the control-plane Ingress so the path the apiserver sees is
    exactly `/<path>`, with no rewrite ambiguity. `path` is the example
    value (e.g. "livez") supplied by the Scenario Outline. We use the
    literal-text decorator style here -- in pytest-bdd 3.2.1 only this
    style substitutes `<placeholder>` references; parsers.parse(...) keeps
    them literal.
    """
    session = utils.requests_retry_session()
    try:
        context["response"] = session.get(
            "https://{ip}:6443/{path}".format(ip=control_plane_ip, path=path),
            verify=False,
        )
    except requests.exceptions.ConnectionError as exc:
        pytest.fail("Failed to access API server with error: {}".format(exc))


@when("we perform an authenticated request on the API server '<path>' endpoint")
def perform_authenticated_request(context, control_plane_ip, k8s_client, path):
    """Hit kube-apiserver directly on :6443 with the admin client cert.

    Same notes as the anonymous variant on URL construction and on the
    decorator style.
    """
    config = k8s_client.client.configuration
    session = utils.requests_retry_session()
    try:
        context["response"] = session.get(
            "https://{ip}:6443/{path}".format(ip=control_plane_ip, path=path),
            verify=config.ssl_ca_cert,
            cert=(config.cert_file, config.key_file),
        )
    except requests.exceptions.ConnectionError as exc:
        pytest.fail("Failed to access API server with error: {}".format(exc))


# }}}
# Then {{{


@then("we can reach the OIDC openID configuration")
def reach_openid_config(host, control_plane_ingress_ep):
    session = utils.requests_retry_session(
        # Both Dex and the ingress controller may fail with one of the following codes
        status_forcelist=(500, 502, 503, 504),
        retries=10,
        backoff_factor=2,
    )

    def _get_openID_config():
        try:
            response = session.get(
                control_plane_ingress_ep + "/oidc/.well-known/openid-configuration",
                verify=False,
            )
        except requests.exceptions.ConnectionError as exc:
            pytest.fail(
                "Unable to reach OpenID Configuration with error: {}".format(exc)
            )

        assert response.status_code == 200
        response_body = response.json()
        assert all(key in response_body for key in ["issuer", "authorization_endpoint"])
        assert response_body["issuer"] == control_plane_ingress_ep + "/oidc"
        assert (
            response_body["authorization_endpoint"]
            == control_plane_ingress_ep + "/oidc/auth"
        )

    utils.retry(_get_openID_config, times=10, wait=5)


@then(
    parsers.parse("the server returns '{status_code}' with message '{status_message}'")
)
def server_returns(host, context, status_code, status_message):
    response = context.get("response")
    assert response is not None

    expected_code = int(status_code)
    actual_url = response.request.url if response.request else "<unknown>"
    actual_body_excerpt = response.text[:500].replace("\n", "\\n")

    # kube-apiserver returns either:
    #   * a plain-text body (e.g. /livez returns "ok\n"), or
    #   * a structured `Status` JSON object (e.g. on a 401 with
    #     AuthenticationConfiguration in use, the body is
    #     {"kind":"Status",...,"message":"Unauthorized","code":401}).
    # Compare against `message` for the JSON case, against the raw text
    # otherwise.
    try:
        parsed = response.json()
    except ValueError:
        parsed = None
    actual_message = (
        parsed.get("message")
        if isinstance(parsed, dict) and parsed.get("kind") == "Status"
        else response.text.rstrip("\n")
    )

    assert response.status_code == expected_code, (
        "Expected HTTP {expected} but got {actual} from {url}. "
        "Body excerpt: {body}".format(
            expected=expected_code,
            actual=response.status_code,
            url=actual_url,
            body=actual_body_excerpt,
        )
    )
    assert actual_message == status_message, (
        "Expected message {expected!r} but got {actual!r} from {url}. "
        "Body excerpt: {body}".format(
            expected=status_message,
            actual=actual_message,
            url=actual_url,
            body=actual_body_excerpt,
        )
    )


#  }}}
