import datetime
import os
import pathlib
import time
import uuid
import yaml

import kubernetes.client
import pytest
from pytest_bdd import scenario, given, when, then, parsers

from tests import utils, kube_utils

# Constants {{{

MANIFESTS_PATH = pathlib.Path("/etc/kubernetes/manifests/")
LOGGER_POD_TEMPLATE = (
    pathlib.Path(__file__) / ".." / "files" / "logger-pod.yaml.tpl"
).resolve()

# }}}

# Fixtures {{{


@pytest.fixture(scope="function")
def context():
    return {}


# }}}
# Scenario {{{


@scenario("../features/logging.feature", "List Pods")
def test_list_pods(host):
    pass


@scenario("../features/logging.feature", "Expected Pods")
def test_expected_pods(host):
    pass


@scenario("../features/logging.feature", "Pushing log to Loki directly")
def test_push_log_to_loki(host):
    pass


@scenario("../features/logging.feature", "Logging pipeline is working")
def test_logging_pipeline_is_working(host):
    pass


# }}}
# Given {{{


@given("the Loki API is available")
def given_check_loki_api(k8s_client):
    check_loki_api(k8s_client, "loki")


@given("we have set up a logger pod", target_fixture="pod_creation_ts")
def set_up_logger_pod(k8s_client, utils_image):
    manifest_file = os.path.join(
        os.path.realpath(os.path.dirname(__file__)), "files", "logger-pod.yaml"
    )
    with open(manifest_file, encoding="utf-8") as fd:
        manifest = yaml.safe_load(fd)

    manifest["spec"]["containers"][0]["image"] = utils_image
    name = manifest["metadata"]["name"]
    namespace = manifest["metadata"]["namespace"]

    pod_k8s_client = k8s_client.resources.get(api_version="v1", kind="Pod")
    result = pod_k8s_client.create(body=manifest, namespace=namespace)
    pod_creation_ts = int(
        datetime.datetime.strptime(
            result.metadata.creationTimestamp, "%Y-%m-%dT%H:%M:%SZ"
        ).timestamp()
    )

    utils.retry(
        kube_utils.check_pod_status(
            k8s_client,
            name=name,
            namespace=namespace,
            state="Succeeded",
        ),
        times=10,
        wait=5,
        name="wait for Pod '{}'".format(name),
    )

    yield pod_creation_ts

    pod_k8s_client.delete(
        name=name,
        namespace=namespace,
        body=kubernetes.client.V1DeleteOptions(
            grace_period_seconds=0,
        ),
    )


# }}}
# When {{{


@when("we push an example log to Loki")
def push_log_to_loki(k8s_client, context):
    context["test_log_id"] = str(uuid.uuid1())

    # With current k8s client we cannot pass Body so we need to
    # use `call_api` directly
    # https://github.com/kubernetes-client/python/issues/325
    path_params = {
        "name": "loki:http-metrics",
        "namespace": "metalk8s-logging",
        "path": "loki/api/v1/push",
    }
    body = {
        "streams": [
            {
                "stream": {"reason": "TestLog", "identifier": context["test_log_id"]},
                "values": [[str(int(time.time() * 1e9)), "My Simple Test Log Line"]],
            }
        ]
    }
    response = k8s_client.client.call_api(
        "/api/v1/namespaces/{namespace}/services/{name}/proxy/{path}",
        "POST",
        path_params,
        [],
        {"Accept": "*/*"},
        body=body,
        response_type="str",
        auth_settings=["BearerToken"],
    )
    assert response[1] == 204, response


# }}}
# Then {{{


@then("we can query this example log from Loki")
def query_log_from_loki(k8s_client, context):
    query = {"query": '{{identifier="{0}"}}'.format(context["test_log_id"])}

    def _check_example_log():
        response = query_loki_api(k8s_client, query)
        result_data = response[0]["data"]["result"]

        assert result_data, "No test log found in Loki with identifier={}".format(
            context["test_log_id"]
        )
        assert result_data[0]["stream"]["identifier"] == context["test_log_id"]

    utils.retry(
        _check_example_log,
        times=40,
        wait=5,
        name="check the example log can be retrieved",
    )


@then("we can retrieve logs from logger pod in Loki API")
def retrieve_pod_logs_from_loki(k8s_client, pod_creation_ts):
    query = {
        "query": '{pod="logger"}',
        "start": pod_creation_ts,
    }

    def _check_log_line_exists():
        response = query_loki_api(k8s_client, query, route="query_range")
        try:
            result_data = response[0]["data"]["result"][0]["values"]
        except IndexError:
            result_data = []
        assert any(
            "logging pipeline is working" in v[1] for v in result_data
        ), "No log found in Loki for 'logger' pod"

    utils.retry(
        _check_log_line_exists,
        times=40,
        wait=5,
        name="check that a log exists for 'logger' pod",
    )


@then(parsers.parse("we can retrieve '{alertname}' alert from Loki API"))
def retrieve_alert_from_loki(k8s_client, alertname):
    query = {
        "query": '{app="metalk8s-alert-logger"}',
    }

    def _check_alert_exists():
        response = query_loki_api(k8s_client, query, route="query_range")
        try:
            alerts = response[0]["data"]["result"][0]["values"]
        except (IndexError, KeyError):
            alerts = []

        alert_found = False
        for element in alerts:
            alert = json.loads(element[1])
            if alert.get("labels", []).get("alertname") == alertname:
                alert_found = True

        assert alert_found, "No '{0}' alert found in Loki".format(alertname)

    utils.retry(
        _check_alert_exists,
        times=40,
        wait=5,
        name="check that cluster alerts are logged in Loki",
    )


@then("the Loki API is available through Service '{service}'")
def then_check_loki_api(k8s_client, service):
    check_loki_api(k8s_client, service)


# }}}

# Helpers {{{


def query_loki_api(k8s_client, content, route="query"):
    # With current k8s client we cannot pass query_params so we need to
    # use `call_api` directly
    path_params = {
        "name": "loki:http-metrics",
        "namespace": "metalk8s-logging",
        "path": "loki/api/v1/{0}".format(route),
    }
    response = k8s_client.client.call_api(
        "/api/v1/namespaces/{namespace}/services/{name}/proxy/{path}",
        "GET",
        path_params,
        content,
        {"Accept": "*/*"},
        response_type=object,
        auth_settings=["BearerToken"],
    )

    assert response[0]["status"] == "success"

    return response


def check_loki_api(k8s_client, service):
    def _check_loki_ready():
        # NOTE: We use Kubernetes client instead of DynamicClient as it
        # ease the "service proxy path"
        client = kubernetes.client.CoreV1Api(api_client=k8s_client.client)
        try:
            response = client.connect_get_namespaced_service_proxy_with_path(
                f"{service}:http-metrics", "metalk8s-logging", path="ready"
            )
        except Exception as exc:  # pylint: disable=broad-except
            assert False, str(exc)
        assert response == "ready\n"

    utils.retry(_check_loki_ready, times=10, wait=2, name="checking Loki API ready")


# }}}
