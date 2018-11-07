import json

import kubernetes.config

import pytest_bdd
import pytest_bdd.parsers

import utils.helper

pytest_bdd.scenarios('features/metrics_server.feature')


@pytest_bdd.when('I wait for metrics-server to be initialized')
def wait_until_initialized(kubeconfig):
    client = kubernetes.config.new_client_from_config(config_file=kubeconfig)

    # It can take up to a minute before metrics-server scraped some stats, see
    # https://github.com/kubernetes-incubator/metrics-server/issues/134 and
    # https://github.com/kubernetes-incubator/metrics-server/issues/136
    for _ in utils.helper.Retry(90, wait=1):
        try:
            (_, response_code, _) = client.call_api(
                '/api/v1/namespaces/kube-system/services'
                '/https:metrics-server:443/proxy/healthz',
                'GET', _preload_content=False)
        except kubernetes.client.rest.ApiException as exc:
            response_code = exc.status

        if response_code == 200:
            break


@pytest_bdd.when(pytest_bdd.parsers.parse('I GET a {kind} from {path}'))
def raw_request(request, kubeconfig, kind, path):
    client = kubernetes.config.new_client_from_config(config_file=kubeconfig)

    (response, response_code, response_headers) = client.call_api(
        path, 'GET', _preload_content=False)

    assert response_code == 200
    assert response_headers['content-type'] == 'application/json'

    request.raw_response = json.loads(response.data.decode('utf-8'))

    assert request.raw_response['kind'] == kind


@pytest_bdd.then(pytest_bdd.parsers.parse(
    'I should count as many nodes as {group_name} hosts'))
@utils.helper.Retry(count=360, wait=10)
def node_count_match(request, inventory_obj, group_name):
    assert len(request.raw_response['items']) == \
        len(inventory_obj.get_groups_dict()[group_name])
