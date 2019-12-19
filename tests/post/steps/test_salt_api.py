import base64
import json

import requests

import pytest
from pytest_bdd import parsers, scenario, then, when


@scenario('../features/salt_api.feature', 'Login to SaltAPI')
def test_login_to_salt_api(host):
    pass


@scenario('../features/salt_api.feature', 'Login to SaltAPI using an incorrect password')
def test_login_to_salt_api_using_an_incorrect_password(host, request):
    pass


@scenario('../features/salt_api.feature', 'Login to SaltAPI using an incorrect username')
def test_login_to_salt_api_using_an_incorrect_username(host, request):
    pass


@pytest.fixture(scope='function')
def context():
    return {}


@when(parsers.parse(
    "we login to SaltAPI as '{username}' using password '{password}'"))
def login_salt_api(host, username, password, version, context, request):
    cmd_ip = ' '.join([
        'salt-call --local',
        'grains.get',
        'metalk8s:control_plane_ip',
        '--out json',
    ])
    with host.sudo():
        cmd_output = host.check_output(cmd_ip)
    ip = json.loads(cmd_output)['local']

    port = 4507

    token = base64.encodebytes(
        '{}:{}'.format(username, password).encode('utf-8')).rstrip()
    response = requests.post(
        'https://{ip}:{port}/login'.format(ip=ip, port=port),
        data={
            'eauth': 'kubernetes_rbac',
            'username': username,
            'token': token,
            'token_type': 'Basic',
        },
        verify=False,
    )

    result = {
        'url': 'https://{ip}:{port}'.format(ip=ip, port=port),
        'token': None,
        'perms': [],
        'login-status-code': response.status_code,
    }

    if response.status_code == 200:
        json_data = response.json()

        result['token'] = json_data['return'][0]['token']
        result['perms'] = json_data['return'][0]['perms']

    context['salt-api'] = result


@then('we can ping all minions')
def ping_all_minions(host, context):
    result = requests.post(
        context['salt-api']['url'],
        json=[
            {
                'client': 'local',
                'tgt': '*',
                'fun': 'test.ping',
            },
        ],
        headers={
            'X-Auth-Token': context['salt-api']['token'],
        },
        verify=False,
    )

    result_data = result.json()

    assert result_data['return'][0] != []


@then('authentication fails')
def authentication_fails(host, context):
    assert context['salt-api']['login-status-code'] == 401

@then(parsers.parse(
    "we can invoke '{modules}' on '{targets}'"))
def invoke_module_on_target(host, context, modules, targets):
    assert { targets: [ modules ] } in context['salt-api']['perms']

@then(parsers.parse("we have '{perms}' perms"))
def have_perms(host, context, perms):
    assert perms in context['salt-api']['perms']
