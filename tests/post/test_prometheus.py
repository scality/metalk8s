import logging

import pytest
import requests

from pytest_bdd import parsers
from pytest_bdd import scenarios
from pytest_bdd import then
from pytest_bdd import when


@pytest.fixture
def pytestbdd_strict_gherkin():
   return False


scenarios('features/prometheus.feature')


@when(parsers.parse("I list the prometheus '{prometheus_endpoints}' job endpoints"))
def get_prometheus_endpoint(request, kubectl_proxy, prometheus_endpoints):
    prometheus_endpoints_res = requests.get(
        'http://127.0.0.1:8001/api/v1/namespaces/kube-ops/services/kube-prometheus:http/proxy/'
        'api/v1/targets')

    prometheus_endpoints_res.raise_for_status()

    def filter_endpoints(endpoints_result, job_label):
        for endpoint in endpoints_result['data']['activeTargets']:
            logging.debug('Prometheus Endpoint found {}'.format(endpoint))
            try:
                if endpoint['labels']['job'] == job_label:
                    yield endpoint
            except KeyError:
                logging.warning('Endpoints {} has no job label'.format(endpoint))

    endpoints_list = list(filter_endpoints(
        prometheus_endpoints_res.json(),
        prometheus_endpoints))
    request.prometheus_endpoints = endpoints_list
    return endpoints_list


@then(parsers.parse('I should count as many endpoints as {group_name} hosts'))
def count_prometheus_endpoint(request, group_name, inventory_obj):
    assert len(request.prometheus_endpoints) == len(inventory_obj.get_groups_dict()[group_name])
