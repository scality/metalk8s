import json
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

@scenario('../features/authentication.feature', 'List Pods')
def test_list_pods(host):
    pass


@scenario('../features/authentication.feature', 'Expected Pods')
def test_expected_pods(host):
    pass


@scenario('../features/authentication.feature', 'Reach the OpenID Config')
def test_reach_openid_config(host):
    pass


@scenario('../features/authentication.feature', 'Access HTTPS service')
def test_access_https_service(host):
    pass


@scenario('../features/authentication.feature',
          'Login to Dex using incorrect email')
def test_failed_login(host):
    pass


@scenario('../features/authentication.feature',
          'Login to Dex using correct email and password')
def test_login(host):
    pass


# }}}


# Fixtures {{{

@pytest.fixture(scope='function')
def context():
    return {}


@pytest.fixture(scope='function')
def control_plane_ip(host):
    with host.sudo():
        output = host.check_output(' '.join([
            'salt-call', '--local', '--out=json',
            'grains.get', 'metalk8s:control_plane_ip',
        ]))
        ip = json.loads(output)['local']
    return ip


# }}}


# Given {{{


@given(parsers.parse(
    "the control-plane Ingress path '{path}' is available"))
def check_cp_ingress_pod_and_container(
    request,
    host,
    k8s_client,
    control_plane_ip
):
    ssh_config = request.config.getoption('--ssh-config')
    label = "release=nginx-ingress-control-plane"
    namespace = "metalk8s-ingress"

    def _wait_for_ingress_pod_and_container():
        try:
            pods = kube_utils.get_pods(
                k8s_client, ssh_config, label, namespace=namespace
            )
        except Exception as exc:
            pytest.fail("unable to get pods with error: {}".format(exc))

        assert pods, ("No pod with label {} found".format(label))

        for pod in pods:
            assert all(
                container.ready == True
                for container in pod.status.container_statuses
            )

    utils.retry(
        _wait_for_ingress_pod_and_container,
        times=10,
        wait=5,
        name="wait for pod labeled '{}'".format(label)
    )
    # Todo: check the provided path and ensure it does not redirect to the
    # default-backend


# }}}


# When {{{


@when(parsers.parse(
    "we perform a request on '{path}' with port '{port}' on control-plane IP"))
def perform_request(host, context, control_plane_ip, path, port):
    try:
        context['response'] = utils.requests_retry_session().get(
            'https://{ip}:{port}{path}'.format(
                ip=control_plane_ip, port=port, path=path
            ),
            verify=False,
        )
    except requests.exceptions.ConnectionError as exc:
        pytest.fail(
            "Failed to access oidc url path with error: {}".format(exc)
        )


@when(parsers.parse(
    "we login to Dex as '{username}' using password '{password}'"))
def dex_login(host, control_plane_ip, username, password, context):
    context['login_response'] = _dex_auth_request(
        control_plane_ip, username, password
    )


# }}}


# Then {{{


@then("we can reach the OIDC openID configuration")
def reach_openid_config(host, control_plane_ip):
    def _get_openID_config():
        try:
            response = utils.requests_retry_session().get(
                'https://{}:{}/oidc/.well-known/openid-configuration'.format(
                    control_plane_ip, INGRESS_PORT
                ),
                verify=False,
            )
        except requests.exceptions.ConnectionError as exc:
            pytest.fail(
                "Unable to reach OpenID Configuration with error: {}".format(
                    exc
                )
            )

        assert response.status_code == 200
        response_body = response.json()
        # check for the existence of  keys[issuer, authorization_endpoint]
        assert 'issuer' and 'authorization_endpoint' in response_body
        assert response_body.get('issuer') == 'https://{}:{}/oidc'.format(
            control_plane_ip, INGRESS_PORT
        )
        assert response_body.get(
            'authorization_endpoint') == 'https://{}:{}/oidc/auth'.format(
            control_plane_ip, INGRESS_PORT
        )

    utils.retry(_get_openID_config, times=10, wait=5)


@then(parsers.parse(
    "the server returns '{status_code}' with message '{status_message}'"))
def server_returns(host, context, status_code, status_message):
    response = context.get('response')
    assert response is not None
    assert response.status_code == int(status_code)
    assert response.text.rstrip('\n') == status_message


@then(parsers.parse("authentication fails with login error"))
def failed_login(host, context):
    auth_response = context.get('login_response')
    assert auth_response.text is not None
    assert auth_response.status_code == 200
    # 'Invalid Email Address and password' is found in auth_response.text
    assert 'Invalid Email Address and password' in auth_response.text
    assert auth_response.headers.get('location') is None


@then(parsers.parse("the server returns '{status_code}' with an ID token"))
def successful_login(host, context, status_code):
    auth_response = context.get('login_response')
    if auth_response.text is None:
        assert False
    assert auth_response.status_code == int(status_code)
    assert auth_response.headers.get('location') is not None


#  }}}


# Helper {{{


def _dex_auth_request(control_plane_ip, username, password):
    try:
        response = utils.requests_retry_session().post(
            'https://{}:{}/oidc/auth?'.format(control_plane_ip, INGRESS_PORT),
            data={
                'response_type': 'id_token',
                'client_id': 'metalk8s-ui',
                'scope': 'openid audience:server:client_id:oidc-auth-client',
                'redirect_uri': 'https://{}:{}/oauth2/callback'.format(
                    control_plane_ip, INGRESS_PORT
                ),
                'nonce': 'nonce'
            },
            verify=False,
        )
    except requests.exceptions.ConnectionError as exc:
        pytest.fail("Dex authentication request failed with error: {}".format(
            exc
            )
        )

    auth_request = response.text  # response is an html form
    # form action looks like:
    # <a href="/oidc/auth/local?req=ovc5qdll5zznlubewjok266rl" target="_self">
    try:
        reqpath = re.search(
            r'href=[\'"](?P<reqpath>/oidc/\S+)[\'"] ', auth_request
        ).group('reqpath')

    except AttributeError as exc:
        raise AttributeError(exc)

    try:
        result = requests.post(
            "https://{}:{}{}".format(
                control_plane_ip, INGRESS_PORT, reqpath
            ),
            data={
                'login': username,
                'password': password
            },
            verify=False, allow_redirects=False,
        )
    except requests.exceptions.ConnectionError as exc:
        pytest.fail("Unable to login with error: {}".format(exc))

    return result


# }}}
