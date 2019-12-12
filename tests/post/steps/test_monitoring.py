import requests
import json

from pytest_bdd import scenario, given, then, parsers

import kubernetes.client
from kubernetes.client.rest import ApiException

from tests import kube_utils
from tests import utils


# Scenarios {{{

@scenario('../features/monitoring.feature', 'List Pods')
def test_list_pods(host):
    pass


@scenario('../features/monitoring.feature', 'Expected Pods')
def test_expected_pods(host):
    pass


@scenario('../features/monitoring.feature', 'Monitored components statuses')
def test_monitored_components(host):
    pass


@scenario(
    '../features/monitoring.feature',
    'Pod metrics can be retrieved using metrics.k8s.io/v1beta1')
def test_pod_metrics(host):
    pass


@scenario(
    '../features/monitoring.feature',
    'Node metrics can be retrieved using metrics.k8s.io/v1beta1')
def test_node_metrics(host):
    pass


# }}}
# Given {{{

@given("the Prometheus API is available")
def check_prometheus_api(host):
    response = _query_prometheus_api(host, 'targets')

    assert response.status_code == 200, response.text


@given(parsers.parse("the '{name}' APIService exists"))
def apiservice_exists(host, name, k8s_apiclient, request):
    client = kubernetes.client.ApiregistrationV1Api(api_client=k8s_apiclient)

    def _check_object_exists():
        try:
            _ = client.read_api_service(name)
        except ApiException as err:
            if err.status == 404:
                raise AssertionError('APIService not yet created')
            raise

    utils.retry(_check_object_exists, times=20, wait=3)



# }}}
# Then {{{

@then(parsers.parse(
    "job '{job}' in namespace '{namespace}' is '{health}'"
))
def check_job_health(host, job, namespace, health):
    def _wait_job_status():
        response = _query_prometheus_api(host, 'targets')
        active_targets = response.json()['data']['activeTargets']

        job_found = False
        for target in active_targets:
            if target['labels']['job'] == job and \
                    target['labels']['namespace'] == namespace:
                assert target['health'] == health, target['lastError']
                job_found = True

        assert job_found, 'Unable to find {} in Prometheus targets'.format(job)

    # Here we do a lot of retries because some pods can be really slow to start
    # e.g. kube-state-metrics
    utils.retry(
        _wait_job_status,
        times=30,
        wait=3,
        name="wait for job '{}' in namespace '{}' being '{}'".format(
            job, namespace, health)
    )


@then(parsers.parse("the '{name}' APIService is {condition}"))
def apiservice_condition_met(name, condition, k8s_apiclient):
    client = kubernetes.client.ApiregistrationV1Api(api_client=k8s_apiclient)

    def _check_object_exists():
        try:
            svc = client.read_api_service(name)

            ok = False
            for cond in svc.status.conditions:
                if cond.type == condition:
                    assert cond.status == 'True', \
                        '{} condition is True'.format(condition)
                    ok = True

            assert ok, '{} condition not found'.format(condition)
        except ApiException as err:
            if err.status == 404:
                raise AssertionError('APIService not yet created')
            raise

    utils.retry(_check_object_exists, times=20, wait=3)


@then(parsers.parse(
    "a pod with label '{label}' in namespace '{namespace}' has metrics"))
def pod_has_metrics(label, namespace, k8s_apiclient):
    def _pod_has_metrics():
        result = k8s_apiclient.call_api(
            resource_path='/apis/metrics.k8s.io/v1beta1/'
                          'namespaces/{namespace}/pods',
            method='GET',
            response_type=object,
            path_params={
                'namespace': namespace,
            },
            query_params=[
                ('labelSelector', label),
            ],
            _return_http_data_only=True,
        )

        assert result['apiVersion'] == 'metrics.k8s.io/v1beta1'
        assert result['kind'] == 'PodMetricsList'
        assert result['items'] != []
        assert result['items'][0]['containers'] != []
        assert result['items'][0]['containers'][0]['usage']['cpu']
        assert result['items'][0]['containers'][0]['usage']['memory']

    # Metrics are only available after a while (by design)
    utils.retry(_pod_has_metrics, times=60, wait=3)


@then(parsers.parse("a node with label '{label}' has metrics"))
def node_has_metrics(label, k8s_apiclient):
    def _node_has_metrics():
        result = k8s_apiclient.call_api(
            resource_path='/apis/metrics.k8s.io/v1beta1/nodes',
            method='GET',
            response_type=object,
            query_params=[
                ('labelSelector', label),
            ],
            _return_http_data_only=True,
        )

        assert result['apiVersion'] == 'metrics.k8s.io/v1beta1'
        assert result['kind'] == 'NodeMetricsList'
        assert result['items'] != []
        assert result['items'][0]['usage']['cpu']
        assert result['items'][0]['usage']['memory']

    # Metrics are only available after a while (by design)
    utils.retry(_node_has_metrics, times=60, wait=3)


# }}}
# Helpers {{{

def _query_prometheus_api(host, route):
    ip = _get_local_grain(host, 'metalk8s:control_plane_ip')

    return requests.get(
        'https://{ip}:8443/api/prometheus/api/v1/{route}'
        .format(ip=ip, route=route),
        verify=False,
    )


def _get_local_grain(host, key):
    with host.sudo():
        output = host.check_output(
            'salt-call --local --out=json grains.get "{}"'.format(key)
        )
        ip = json.loads(output)['local']

    return ip


# }}}
