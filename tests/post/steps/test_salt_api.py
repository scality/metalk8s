import ast

import kubernetes.client
import requests

import pytest
from pytest_bdd import parsers, scenario, then, when

from tests.utils import negation


# Scenario {{{


@scenario("../features/salt_api.feature", "Login to SaltAPI using Basic auth")
def test_login_basic_auth_to_salt_api(host):
    pass


@scenario(
    "../features/salt_api.feature", "Login to SaltAPI using an admin ServiceAccount"
)
def test_login_salt_api_admin_sa(host):
    pass


@scenario(
    "../features/salt_api.feature",
    "Login to SaltAPI using the storage-operator ServiceAccount",
)
def test_login_salt_api_storage_operator(host):
    pass


@scenario("../features/salt_api.feature", "Login to SaltAPI using any ServiceAccount")
def test_login_salt_api_service_account(host):
    pass


@scenario(
    "../features/salt_api.feature", "SaltAPI impersonation using a ServiceAccount"
)
def test_salt_api_impersonation_with_bearer_auth(host):
    pass


@pytest.fixture
def salt_api_address(control_plane_ip):
    return "{}:{}".format(control_plane_ip, 4507)


@pytest.fixture(scope="function")
def context():
    return {}


# }}}
# When {{{


@when(parsers.parse("we login to SaltAPI as '{username}' using password '{password}'"))
def login_salt_api_basic(host, username, password, salt_api_address, context):
    context["salt-api"] = _salt_api_login(
        salt_api_address, username=username, password=password
    )


@when("we login to SaltAPI with an admin ServiceAccount")
def login_salt_api_admin_sa(host, k8s_client, admin_sa, salt_api_address, context):
    sa_name, sa_namespace = admin_sa

    context["salt-api"] = _login_salt_api_sa(
        salt_api_address, k8s_client, sa_name, sa_namespace
    )


@when(
    parsers.parse(
        "we login to SaltAPI with the ServiceAccount '{namespace}/{account_name}'"
    )
)
def login_salt_api_system_sa(
    host, k8s_client, namespace, account_name, salt_api_address, context
):
    context["salt-api"] = _login_salt_api_sa(
        salt_api_address,
        k8s_client,
        account_name,
        namespace,
    )


@when(
    parsers.parse(
        "we impersonate user '{username}' against SaltAPI "
        "using the ServiceAccount '{namespace}/{account_name}'"
    )
)
def login_salt_api_token_override_username(
    host, k8s_client, namespace, account_name, username, salt_api_address, context
):
    context["salt-api"] = _login_salt_api_sa(
        salt_api_address,
        k8s_client,
        account_name,
        namespace,
        username=username,
    )


# }}}
# Then {{{


@then(
    parsers.cfparse(
        "we can{negated:Negation?} ping all minions",
        extra_types={"Negation": negation},
    )
)
def ping_all_minions(host, context, negated):
    result = _salt_call(context, "test.ping", tgt="*")

    if negated:
        assert result.status_code == 401
        assert "No permission" in result.text
    else:
        result_data = result.json()
        assert result_data["return"][0] != []


@then(
    parsers.cfparse(
        "we can{negated:Negation?} run state '{module}' on '{targets}'",
        extra_types={"Negation": negation},
    )
)
def run_state_on_targets(host, context, negated, module, targets):
    result = _salt_call(context, "state.sls", tgt=targets, kwarg={"mods": module})

    if negated:
        assert result.status_code == 401
        assert "No permission" in result.text
    else:
        assert result.status_code == 200


@then("authentication fails")
def authentication_fails(host, context):
    assert context["salt-api"]["login-status-code"] == 401


@then("authentication succeeds")
def authentication_succeeds(host, context):
    assert context["salt-api"]["login-status-code"] == 200


@then(parsers.parse("we can invoke '{modules}' on '{targets}'"))
def invoke_module_on_target(host, context, modules, targets):
    assert {targets: ast.literal_eval(modules)} in context["salt-api"]["perms"]


@then(parsers.parse("we have '{perms}' perms"))
def have_perms(host, context, perms):
    assert perms in context["salt-api"]["perms"]


@then(parsers.parse("we have no permissions"))
def have_no_perms(host, context):
    assert context["salt-api"]["perms"] == {}


# }}}
# Helpers {{{


def _login_salt_api_sa(address, k8s_client, name, namespace, username=None):
    # NOTE: We use Kubernetes client instead of DynamicClient as it
    # ease the retrieving of ServiceAccount Token
    client = kubernetes.client.CoreV1Api(k8s_client.client)

    response = client.create_namespaced_service_account_token(
        name=name,
        namespace=namespace,
        body=kubernetes.client.AuthenticationV1TokenRequest(spec={}),
    )
    token = response.status.token

    if username is None:
        username = "system:serviceaccount:{}:{}".format(namespace, name)

    return _salt_api_login(address, username=username, token=token)


def _salt_api_login(address, username=None, password=None, token=None):
    data = {"eauth": "kubernetes_rbac"}

    if username:
        data["username"] = username
    if password:
        data["password"] = password
    if token:
        data["token"] = token

    response = requests.post(
        "https://{}/login".format(address),
        data=data,
        verify=False,
    )
    result = {
        "url": "https://{}".format(address),
        "token": None,
        "perms": [],
        "login-status-code": response.status_code,
    }
    if response.status_code == 200:
        json_data = response.json()
        result["token"] = json_data["return"][0]["token"]
        result["perms"] = json_data["return"][0]["perms"]
    return result


def _salt_call(context, fun, tgt="*", arg=None, kwarg=None):
    action = {
        "client": "local",
        "tgt": tgt,
        "fun": fun,
    }
    if arg is not None:
        action["arg"] = arg
    if kwarg is not None:
        action["kwarg"] = kwarg

    return requests.post(
        context["salt-api"]["url"],
        json=[action],
        headers={
            "X-Auth-Token": context["salt-api"]["token"],
        },
        verify=False,
    )


# }}}
