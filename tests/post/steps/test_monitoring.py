import json
import operator
import pathlib
import random
import string
import yaml

from kubernetes.client.rest import ApiException

import pytest
from pytest_bdd import scenario, given, when, then, parsers
import testinfra

from tests import utils
from tests import kube_utils

# Constants {{{

LOCAL_DIR = pathlib.Path(__file__).parent
ALERT_RULE_FILE = LOCAL_DIR / "../../../tools/rule_extractor/alerting_rules.json"
DASHBOARD_UIDS_FILE = LOCAL_DIR / "files/grafana_dashboard_uids.json"

NODE_EXPORTER_PORT = 9100

# }}}
# Scenarios {{{


@scenario("../features/monitoring.feature", "List Pods")
def test_list_pods(host):
    pass


@scenario("../features/monitoring.feature", "Expected Pods")
def test_expected_pods(host):
    pass


@scenario("../features/monitoring.feature", "Monitored components statuses")
def test_monitored_components(host):
    pass


@scenario(
    "../features/monitoring.feature", "The metrics.k8s.io/v1beta1 API is available"
)
def test_apiservice_available(host):
    pass


@scenario(
    "../features/monitoring.feature",
    "Pod metrics can be retrieved using metrics.k8s.io/v1beta1",
)
def test_pod_metrics(host):
    pass


@scenario(
    "../features/monitoring.feature",
    "Node metrics can be retrieved using metrics.k8s.io/v1beta1",
)
def test_node_metrics(host):
    pass


@scenario(
    "../features/monitoring.feature",
    "Ensure deployed Prometheus rules match the default",
)
def test_deployed_prometheus_rules(host):
    pass


@scenario(
    "../features/monitoring.feature", "Volume metrics can be found based on device name"
)
def test_volume_metrics(host):
    pass


@scenario("../features/monitoring.feature", "Expected Grafana dashboards are available")
def test_expected_grafana_dashboards(host):
    pass


@scenario(
    "../features/monitoring.feature",
    "Inserting a new ConfigMap provides a new datasource",
)
def test_configmap_add_datasource(host, teardown):
    pass


# }}}
# Fixture {{{


@pytest.fixture(scope="function")
def context():
    return {}


@pytest.fixture
def teardown(context, k8s_client):
    yield
    if "config_map_to_delete" in context:
        for cm_name, cm_namespace in context["config_map_to_delete"]:
            k8s_client.resources.get(api_version="v1", kind="ConfigMap").delete(
                name=cm_name, namespace=cm_namespace
            )


# }}}
# Given {{{


@given("the Prometheus API is available")
def check_prometheus_api(prometheus_api):
    try:
        prometheus_api.get_targets()
    except utils.PrometheusApiError as exc:
        pytest.fail(str(exc))


@given("the Grafana API is available")
def check_grafana_api(grafana_api):
    try:
        grafana_api.get_admin_stats()
    except utils.GrafanaApiError as exc:
        pytest.fail(str(exc))


@given(parsers.parse("the '{name}' APIService exists"))
def apiservice_exists(host, name, k8s_client, request):
    client = k8s_client.resources.get(
        api_version="apiregistration.k8s.io/v1", kind="APIService"
    )

    def _check_object_exists():
        try:
            _ = client.get(name=name)
        except ApiException as err:
            if err.status == 404:
                raise AssertionError("APIService not yet created")
            raise

    utils.retry(_check_object_exists, times=20, wait=3)


# }}}
# When {{{


@when(
    parsers.parse(
        "we put a datasource as ConfigMap named '{name}' in namespace '{namespace}'"
    )
)
def push_datasource_cm(context, k8s_client, name, namespace):
    cm_manifest = {
        "kind": "ConfigMap",
        "apiVersion": "v1",
        "metadata": {
            "name": name,
            "namespace": namespace,
            "labels": {"grafana_datasource": "1"},
        },
        "data": {
            f"{name}.yaml": yaml.dump(
                {
                    "apiVersion": 1,
                    "datasources": [
                        {
                            "name": name,
                            "type": "prometheus",
                            "access": "proxy",
                            "url": "http://fake.prometheus.url:123/",
                            "version": 1,
                        }
                    ],
                },
                default_flow_style=False,
            )
        },
    }

    try:
        k8s_client.resources.get(api_version="v1", kind="ConfigMap").create(
            body=cm_manifest, namespace=namespace
        )
    except ApiException as err:
        raise AssertionError(f"Unable to push Datasource ConfigMap: {err}")

    context.setdefault("config_map_to_delete", []).append((name, namespace))


# }}}
# Then {{{


@then(parsers.parse("job '{job}' in namespace '{namespace}' is '{health}'"))
def check_job_health(prometheus_api, job, namespace, health):
    def _wait_job_status():
        try:
            response = prometheus_api.get_targets()
        except utils.PrometheusApiError as exc:
            pytest.fail(str(exc))

        active_targets = response["data"]["activeTargets"]

        job_found = False
        for target in active_targets:
            if (
                target["labels"]["job"] == job
                and target["labels"]["namespace"] == namespace
            ):
                assert target["health"] == health, target["lastError"]
                job_found = True

        assert job_found, "Unable to find {} in Prometheus targets".format(job)

    # Here we do a lot of retries because some pods can be really slow to start
    # e.g. kube-state-metrics
    utils.retry(
        _wait_job_status,
        times=30,
        wait=3,
        name="wait for job '{}' in namespace '{}' being '{}'".format(
            job, namespace, health
        ),
    )


@then(parsers.parse("the '{name}' APIService is {condition}"))
def apiservice_condition_met(name, condition, k8s_client):
    client = k8s_client.resources.get(
        api_version="apiregistration.k8s.io/v1", kind="APIService"
    )

    def _check_object_exists():
        try:
            svc = client.get(name=name)

            ok = False
            for cond in svc.status.conditions:
                if cond.type == condition:
                    assert cond.status == "True", "{} condition is True".format(
                        condition
                    )
                    ok = True

            assert ok, "{} condition not found".format(condition)
        except ApiException as err:
            if err.status == 404:
                raise AssertionError("APIService not yet created")
            raise

    utils.retry(_check_object_exists, times=20, wait=3)


@then(
    parsers.parse("a pod with label '{label}' in namespace '{namespace}' has metrics")
)
def pod_has_metrics(label, namespace, k8s_client):
    def _pod_has_metrics():
        result = k8s_client.client.call_api(
            resource_path="/apis/metrics.k8s.io/v1beta1/" "namespaces/{namespace}/pods",
            method="GET",
            response_type=object,
            path_params={
                "namespace": namespace,
            },
            query_params=[
                ("labelSelector", label),
            ],
            _return_http_data_only=True,
        )

        assert result["apiVersion"] == "metrics.k8s.io/v1beta1"
        assert result["kind"] == "PodMetricsList"
        assert result["items"] != []
        assert result["items"][0]["containers"] != []
        assert result["items"][0]["containers"][0]["usage"]["cpu"]
        assert result["items"][0]["containers"][0]["usage"]["memory"]

    # Metrics are only available after a while (by design)
    utils.retry(_pod_has_metrics, times=60, wait=3)


@then(parsers.parse("a node with label '{label}' has metrics"))
def node_has_metrics(label, k8s_client):
    def _node_has_metrics():
        result = k8s_client.client.call_api(
            resource_path="/apis/metrics.k8s.io/v1beta1/nodes",
            method="GET",
            response_type=object,
            query_params=[
                ("labelSelector", label),
            ],
            _return_http_data_only=True,
        )

        assert result["apiVersion"] == "metrics.k8s.io/v1beta1"
        assert result["kind"] == "NodeMetricsList"
        assert result["items"] != []
        assert result["items"][0]["usage"]["cpu"]
        assert result["items"][0]["usage"]["memory"]

    # Metrics are only available after a while (by design)
    utils.retry(_node_has_metrics, times=60, wait=3)


@then("I can get I/O stats for this test Volume's device")
def volume_has_io_stats(host, ssh_config, prometheus_api, test_volume):
    # Retrieve control-plane IP of another Node through Salt master, not
    # through testinfra, because the actual Node name may not match our
    # SSH config file
    node_name = test_volume["spec"]["nodeName"]
    command = [
        "salt",
        "--out json",
        node_name,
        "grains.get",
        "metalk8s:control_plane_ip",
    ]
    result = utils.run_salt_command(host, command, ssh_config)
    control_plane_ip = json.loads(result.stdout)[node_name]

    def _volume_has_io_stats():
        for verb in ["read", "write"]:
            result = prometheus_api.query(
                "node_disk_{}s_completed_total".format(verb),
                instance="{}:{}".format(control_plane_ip, NODE_EXPORTER_PORT),
                device=test_volume["status"]["deviceName"],
            )
            assert result["status"] == "success"
            assert len(result["data"]["result"]) > 0

    # May need to wait for metrics to be scraped for our new volume
    utils.retry(_volume_has_io_stats, times=60, wait=3)


@then("the deployed Prometheus alert rules are the same as the default alert rules")
def check_deployed_rules(host, prometheus_api):
    try:
        deployed_rules = prometheus_api.get_rules()
    except utils.PrometheusApiError as exc:
        pytest.fail(str(exc))

    rule_group = deployed_rules.get("data", {}).get("groups", [])
    deployed_alert_rules = []
    for item in rule_group:
        for rule in item.get("rules", []):
            # rule type can be alerting or recording
            # For now, we only need alerting rules
            if rule["type"] == "alerting":
                message = (
                    rule["annotations"].get("message")
                    or rule["annotations"].get("summary")
                    or rule["annotations"].get("description")
                )
                fixup_alerting_rule = {
                    "name": rule["name"],
                    "severity": rule["labels"]["severity"],
                    "message": message,
                    "query": rule["query"],
                }
                deployed_alert_rules.append(fixup_alerting_rule)

    try:
        alert_rules_str = ALERT_RULE_FILE.read_text(encoding="utf-8")
    except IOError as exc:
        pytest.fail(f"Failed to read file {ALERT_RULE_FILE}: {exc!s}")

    try:
        default_alert_rules = json.loads(alert_rules_str)
    except json.JSONDecodeError as exc:
        pytest.fail(f"Failed to decode JSON from {ALERT_RULE_FILE}: {exc!s}")

    assert sorted(
        default_alert_rules, key=operator.itemgetter("name", "severity")
    ) == sorted(
        deployed_alert_rules, key=operator.itemgetter("name", "severity")
    ), "Expected default Prometheus rules to be equal to deployed rules."


@then("the deployed dashboards match the expected ones")
def check_grafana_dashboards(host, grafana_api):
    try:
        deployed_dashboards = grafana_api.get_dashboards()
    except utils.GrafanaAPIError as exc:
        pytest.fail(str(exc))

    try:
        expected_dashboards_str = DASHBOARD_UIDS_FILE.read_text(encoding="utf-8")
    except IOError as exc:
        pytest.fail(f"Failed to read file {DASHBOARD_UIDS_FILE}: {exc!s}")

    try:
        expected_dashboards = json.loads(expected_dashboards_str)
    except json.JSONDecodeError as exc:
        pytest.fail(f"Failed to decode JSON from {DASHBOARD_UIDS_FILE}: {exc!s}")

    uid_mismatches = []
    extra_dashboards = []
    missing_dashboards = list(expected_dashboards.keys())
    for dashboard in deployed_dashboards:
        db_title = dashboard["title"]
        if db_title not in expected_dashboards:
            extra_dashboards.append(db_title)
            continue

        missing_dashboards.remove(db_title)
        db_uid = dashboard["uid"]
        expected_uid = expected_dashboards[db_title]
        if db_uid != expected_uid:
            uid_mismatches.append((db_title, expected_uid, db_uid))

    errors = []
    if missing_dashboards:
        db_list = "', '".join(missing_dashboards)
        errors.append(f"Missing dashboard(s): '{db_list}'")

    if extra_dashboards:
        db_list = "', '".join(extra_dashboards)
        errors.append(f"Extra dashboard(s): '{db_list}'")

    if uid_mismatches:
        mismatches_list = ", ".join(
            f"'{title}' (expected '{expected}', found '{found}')"
            for title, expected, found in uid_mismatches
        )
        errors.append(f"UID mismatch(es): {mismatches_list}")

    if errors:
        pytest.fail(
            "\n".join(["Deployed dashboards do not match expectations:", *errors])
        )


@then(parsers.parse("we have a datasource named '{name}'"))
def check_datasource_exist(grafana_api, name):
    def _check_ds_exist():
        try:
            grafana_api.get_datasource(name=name)
        except utils.GrafanaAPIError as exc:
            raise AssertionError(f"Unable to find datasource named {name}: {exc!s}")

    utils.retry(_check_ds_exist, times=24, wait=5)


# }}}
