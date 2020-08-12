import json
import time
import uuid

import pytest
from pytest_bdd import scenario, given, when, then

from tests import utils

# Fixtures {{{

@pytest.fixture(scope='function')
def context():
    return {}


# }}}
# Scenario {{{


@scenario('../features/logging.feature', 'List Pods')
def test_list_pods(host):
    pass


@scenario('../features/logging.feature', 'Expected Pods')
def test_expected_pods(host):
    pass


@scenario('../features/logging.feature', 'Pushing log to Loki directly')
def test_push_log_to_loki(host):
    pass


# }}}
# Given {{{

@given("the Loki API is available")
def check_loki_api(k8s_client):
    def _check_loki_ready():
        try:
            response = k8s_client.connect_get_namespaced_service_proxy_with_path(
                'loki:http-metrics', 'metalk8s-logging',
                path='ready'
            )
        except Exception as exc:  # pylint: disable=broad-except
            assert False, str(exc)
        assert response == 'ready\n'

    utils.retry(
        _check_loki_ready,
        times=10,
        wait=2,
        name="checking Loki API ready"
    )


# }}}
# When {{{

@when("we push an example log to Loki")
def push_log_to_loki(k8s_client, context):
    context['test_log_id'] = str(uuid.uuid1())

    # With current k8s client we cannot pass Body so we need to
    # use `call_api` directly
    # https://github.com/kubernetes-client/python/issues/325
    path_params = {
        'name': 'loki:http-metrics',
        'namespace': 'metalk8s-logging',
        'path': 'loki/api/v1/push'
    }
    body = {
        "streams": [
            {
                "stream": {
                    "reason": "TestLog",
                    "identifier": context['test_log_id']
                },
                "values": [
                    [str(int(time.time() * 1e9)), "My Simple Test Log Line"]
                ]
            }
        ]
    }
    response = k8s_client.api_client.call_api(
        '/api/v1/namespaces/{namespace}/services/{name}/proxy/{path}',
        'POST',
        path_params,
        [],
        {"Accept": "*/*"},
        body=body,
        response_type='str',
        auth_settings=["BearerToken"]
    )
    assert response[1] == 204, response


# }}}
# Then {{{

@then("we can query this example log from Loki")
def query_log_from_loki(k8s_client, context):
    # With current k8s client we cannot pass query_params so we need to
    # use `call_api` directly
    path_params = {
        'name': 'loki:http-metrics',
        'namespace': 'metalk8s-logging',
        'path': 'loki/api/v1/query'
    }
    query_params = {
        'query': '{identifier="' + context['test_log_id'] + '"}'
    }
    response = k8s_client.api_client.call_api(
        '/api/v1/namespaces/{namespace}/services/{name}/proxy/{path}',
        'GET',
        path_params,
        query_params,
        {"Accept": "*/*"},
        response_type=object,
        auth_settings=["BearerToken"]
    )

    assert response[0]['status'] == 'success'

    result_data = response[0]['data']['result']

    assert result_data, \
        'No test log found in Loki with identifier={}'.format(
            context['test_log_id']
        )
    assert result_data[0]['stream']['identifier'] == context['test_log_id']


# }}}
