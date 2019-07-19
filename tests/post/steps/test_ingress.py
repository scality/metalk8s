import json

import requests
import requests.exceptions

import pytest
from pytest_bdd import given, parsers, scenario, then, when


@scenario('../features/ingress.feature', 'Access HTTP services')
def test_access_http_services(host):
    pass


@scenario('../features/ingress.feature', 'Access HTTPS services')
def test_access_https_services(host):
    pass


@scenario(
    '../features/ingress.feature', 'Access HTTP services on control-plane IP')
def test_access_http_services_on_control_plane_ip(host):
    pass


@pytest.fixture(scope='function')
def context():
        return {}


@given('the node control-plane IP is not equal to its workload-plane IP')
def node_control_plane_ip_is_not_equal_to_its_workload_plane_ip(host):
    with host.sudo():
        output = host.check_output(' '.join([
            'salt-call --local',
            'grains.get metalk8s',
            '--out json',
        ]))

    data = json.loads(output)['local']

    assert 'control_plane_ip' in data
    assert 'workload_plane_ip' in data

    if data['control_plane_ip'] == data['workload_plane_ip']:
        pytest.skip('Node control-plane IP is equal to node workload-plane IP')


@when(parsers.parse(
    "we perform an {protocol} request on port {port} on a {plane} IP"))
def perform_request(host, context, protocol, port, plane):
    protocols = {
        'HTTP': 'http',
        'HTTPS': 'https',
    }

    if protocol not in protocols:
        raise NotImplementedError

    grains = {
        'workload-plane': 'metalk8s:workload_plane_ip',
        'control-plane': 'metalk8s:control_plane_ip',
    }

    if plane not in grains:
        raise NotImplementedError

    with host.sudo():
        ip_output = host.check_output(' '.join([
            'salt-call --local',
            'grains.get {grain}'.format(grain=grains[plane]),
            '--out json',
        ]))
    ip = json.loads(ip_output)['local']

    try:
        context['response'] = requests.get(
            '{proto}://{ip}:{port}'.format(
                proto=protocols[protocol], ip=ip, port=port
            ),
            verify=False,
        )
    except Exception as exc:
        context['exception'] = exc


@then(parsers.re(
    r"the server returns (?P<status_code>\d+) '(?P<reason>.+)'"),
    converters=dict(status_code=int))
def server_returns(host, context, status_code, reason):
    response = context.get('response')
    assert response is not None
    assert response.status_code == int(status_code)
    assert response.reason == reason


@then("the server should not respond")
def server_does_not_respond(host, context):
    assert 'exception' in context
    assert isinstance(
        context['exception'] , requests.exceptions.ConnectionError)
