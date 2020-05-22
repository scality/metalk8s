import json
import pathlib

import kubernetes.client
from kubernetes.client.rest import ApiException

import pytest
from pytest_bdd import scenario, given, then, parsers

from tests import utils

# Constants {{{

ALERT_RULE_FILE_NAME = 'alerting_rules.json'
ALERT_RULE_FILE_PATH = (pathlib.Path(__file__)/'..'/'..'/'..'/'..'
            /'tools'/'rule_extractor'/ALERT_RULE_FILE_NAME).resolve()

# }}}
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


@scenario(
    '../features/monitoring.feature',
    'Ensure deployed Prometheus rules match the default')
def test_deployed_prometheus_rules(host):
    pass


# }}}
# Given {{{

@given("the Prometheus API is available")
def check_prometheus_api(prometheus_api):
    try:
        prometheus_api.get_targets()
    except utils.PrometheusApiError as exc:
        pytest.fail(str(exc))


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
def check_job_health(prometheus_api, job, namespace, health):
    def _wait_job_status():
        try:
            response = prometheus_api.get_targets()
        except utils.PrometheusApiError as exc:
            pytest.fail(str(exc))

        active_targets = response['data']['activeTargets']

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


@then(
    "the deployed Prometheus alert rules are the same as the default "
    "alert rules")
def check_deployed_rules(host, prometheus_api):
    try:
        deployed_rules = prometheus_api.get_rules()
    except utils.PrometheusApiError as exc:
        pytest.fail(str(exc))

    rule_group = deployed_rules.get('data', {}).get('groups', [])
    deployed_alert_rules = []
    for item in rule_group:
        for rule in item.get('rules', []):
            # rule type can be alerting or recording
            # For now, we only need alerting rules
            if rule['type'] == "alerting":
                message = rule['annotations'].get('message') or \
                    rule['annotations'].get('summary')
                fixup_alerting_rule = {
                    'name': rule['name'],
                    'severity': rule['labels']['severity'],
                    'message': message,
                    'query': rule['query']
                }
                deployed_alert_rules.append(fixup_alerting_rule)

    try:
        with open(ALERT_RULE_FILE_PATH) as f:
            try:
                default_alert_rules = json.load(f)
            except json.JSONDecodeError as exc:
                pytest.fail("Failed to decode JSON from {}: {!s}".format(
                    ALERT_RULE_FILE_PATH, exc)
                )
    except IOError as exc:
        pytest.fail(
            "Failed to open file {}: {!s}"
            .format(ALERT_RULE_FILE_NAME, exc)
        )

    assert default_alert_rules == deployed_alert_rules, (
        "Expected default Prometheus rules to be equal to deployed rules."
    )


# }}}
