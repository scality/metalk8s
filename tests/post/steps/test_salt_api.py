import base64
import json

import requests

import pytest
from pytest_bdd import parsers, scenario, then, when

@scenario('../features/salt_api.feature', 'Login to SaltAPI')
def test_login_to_salt_api(host):
    pass


@pytest.fixture(scope='function')
def context():
    return {}


@when(parsers.parse(
    "we login to SaltAPI as '{username}' using password '{password}'"))
def login_salt_api(host, username, password, version, context, request):
    bootstrap_ip = request.config.getoption("--bootstrap-ip")

    if bootstrap_ip is not None:
        # multi nodes
        pytest.skip("Cannot yet run this test on multi-nodes deployment.")

    cmd_cidr = ' '.join([
        'salt-call pillar.get',
        'networks:control_plane',
        'saltenv=metalk8s-{version}'.format(version=version),
        '--out json',
    ])
    with host.sudo():
        cidr_output = host.check_output(cmd_cidr)
    cidr = json.loads(cidr_output)['local']

    cmd_ip = ' '.join([
        'salt-call --local',
        'network.ip_addrs',
        'cidr="{cidr}"'.format(cidr=cidr),
        '--out json',
    ])
    with host.sudo():
        cmd_output = host.check_output(cmd_ip)
    ip = json.loads(cmd_output)['local'][0]

    port = 4507

    token = base64.encodebytes(
        '{}:{}'.format(username, password).encode('utf-8')).rstrip()
    response = requests.post(
        'http://{ip}:{port}/login'.format(ip=ip, port=port),
        data={
            'eauth': 'kubernetes_rbac',
            'username': username,
            'token': token,
            'token_type': 'Basic',
        },
    )
    result = response.json()

    context['salt-api'] = {
        'url': 'http://{ip}:{port}'.format(ip=ip, port=port),
        'token': result['return'][0]['token'],
    }


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
    )

    result_data = result.json()

    assert result_data['return'][0] != []
