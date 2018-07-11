import os

import requests

import testinfra.utils.ansible_runner

testinfra_hosts = testinfra.utils.ansible_runner.AnsibleRunner(
    os.environ['MOLECULE_INVENTORY_FILE']).get_hosts('all')


def _node_exporter_svc(host):
    return host.service('node_exporter')


def test_node_exporter_is_enabled(host):
    assert _node_exporter_svc(host).is_enabled


def test_node_exporter_is_running(host):
    assert _node_exporter_svc(host).is_running


def test_node_exporter_tcp_port(host):
    assert host.socket('tcp://9100').is_listening


def test_node_exporter_metrics():
    resp = requests.get('http://127.0.0.1:9100/metrics')

    assert resp.status_code == 200
    assert resp.headers['content-type'] == 'text/plain; version=0.0.4'

    # This would be node_exporter >= 0.16, which our dashboards don't support
    # (yet)
    assert 'node_cpu_seconds_total' not in resp.text
    # Very basic test for expected metrics (node_exporter >= 0.15 && < 0.16)
    assert 'node_cpu' in resp.text
