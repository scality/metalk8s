from ast import literal_eval
import yaml

import pytest
from pytest_bdd import scenario, given, then, when, parsers

from kubernetes.client import AppsV1Api

from tests import utils


# Fixtures {{{


@pytest.fixture
def k8s_appsv1_client(k8s_apiclient):
    return AppsV1Api(api_client=k8s_apiclient)


@pytest.fixture
def csc(k8s_client):
    return ClusterServiceConfiguration(k8s_client)


# }}}


# Scenarios {{{


@scenario('../features/service_configuration.feature',
          'Propagation of Service Configurations to underlying Services')
def test_service_config_propagation(host):
    pass


@scenario('../features/service_configuration.feature',
          'Customization of pre-defined Prometheus rules')
def test_prometheus_rules_customization(host):
    pass

# }}}


# Given {{{


@given(parsers.parse(
    "we have a '{name}' CSC in namespace '{namespace}'"))
def check_csc_configuration(
    k8s_client,
    csc,
    name,
    namespace,
):
    csc_obj = csc.get(name, namespace)

    assert csc_obj, (
        "No ConfigMap with name {} in namespace {} found".format(
            name, namespace
        )
    )

    return dict(csc_obj=csc_obj)


# }}}


# When {{{


@when(parsers.parse(
    "we update '{name}' CSC in namespace '{namespace}' "
    "'{path}' to '{value}'"))
def update_service_configuration(
    csc,
    name,
    namespace,
    path,
    value
):
    csc_obj = csc.get(name, namespace)

    utils.set_dict_element(csc_obj, path, value)

    patch = {
        'data': {
            'config.yaml': yaml.safe_dump(
                csc_obj, default_flow_style=False
            )
        }
    }
    response = csc.update(name, namespace, patch)

    assert response


@when(parsers.parse("we apply the '{state}' salt state"))
def apply_service_config(host, version, request, k8s_client, state):
    ssh_config = request.config.getoption('--ssh-config')

    cmd = [
        'salt-run', 'state.sls', '{}'.format(state),
        'saltenv=metalk8s-{}'.format(version)
    ]

    def apply_salt_state():
        utils.run_salt_command(host, cmd, ssh_config)

    apply_salt_state()

    request.addfinalizer(apply_salt_state)


# }}}


# Then {{{


@then(parsers.parse(
    "we have '{value}' at '{path}' for '{service}' Deployment in namespace "
    "'{namespace}'"))
def get_deployments(
    k8s_appsv1_client,
    value,
    path,
    service,
    namespace,
    check_csc_configuration,
    csc

):
    def _wait_for_deployment():
        try:
            response = k8s_appsv1_client.read_namespaced_deployment(
                name=service, namespace=namespace
            ).to_dict()
        except Exception as exc:
            pytest.fail(
                "Unable to read {} Deployment with error: {!s}".format(
                    service, exc
                )
            )
        assert literal_eval(value) == utils.get_dict_element(response, path), (
            "Expected value {} for service {}, got {}".format(
                value, service, utils.get_dict_element(response, path)
            )
        )
    utils.retry(
        _wait_for_deployment,
        times=10,
        wait=5,
        name="wait for available Deployments"
    )


@then(parsers.parse(
    "we restore original state of '{name}' CSC in namespace '{namespace}'"))
def restore_csc(
    k8s_client,
    name,
    namespace,
    check_csc_configuration,
    csc
):
    # csc object returned from Given block will be used to
    # patch back the ConfigMap to its original state
    original_csc_obj = check_csc_configuration['csc_obj']

    patch = {
        'data': {
            'config.yaml': yaml.safe_dump(
                original_csc_obj, default_flow_style=False
            )
        }
    }
    result = csc.update(name, namespace, patch)
    assert result, (
        "Failed patching CSC with name {} in namespace {} using patch {}"
        .format(name, namespace, patch)
    )


@then(parsers.parse(
    "we have an alert rule '{rule_name}' in group '{group_name}' with "
    "severity '{severity}' and '{path}' equal to '{value}'"
))
def check_prometheus_alert_rule(
        prometheus_api, rule_name, group_name, severity, path, value):
    """Retrieve an alert rule from the Prometheus API, then
    checks if the given path matches the value.
    """

    def _wait_prometheus_config_reload():
        try:
            rules = prometheus_api.find_rules(
                rule_name, group_name, {'severity': severity}
            )
        except utils.PrometheusApiError as exc:
            pytest.fail(str(exc))

        n_rules = len(rules)
        assert n_rules == 1, (
            "Expecting 1 alert rule '{}' in group '{}' with severity '{}', "
            "but found '{}'."
        ).format(rule_name, group_name, severity, n_rules)

        assert utils.get_dict_element(rules[0], path) == value

    utils.retry(
        _wait_prometheus_config_reload,
        times=20,
        wait=5,
        name="wait for Prometheus configuration reload"
    )

# }}}


# Helpers {{{


class ClusterServiceConfiguration:
    def __init__(self, k8s_client):
        self.client = k8s_client

    def get(self, name, namespace):
        try:
            response = self.client.read_namespaced_config_map(
                name, namespace
            )
        except Exception as exc:
            pytest.fail(
                "Unable to read {} ConfigMap in namespace {} with error: {!s}"
                .format(name, namespace, exc)
            )

        try:
            csc_key = "config.yaml"
            csc_data = response.data[csc_key]
        except KeyError:
            raise Exception(
                "Missing '{}' key in '{}' ConfigMap in namespace '{}'"
                .format(csc_key, name, namespace)
            )

        try:
            csc_object = yaml.safe_load(csc_data)
        except yaml.YAMLError as exc:
            raise Exception(
                'Invalid YAML format in ConfigMap {} in Namespace {} under '
                'key {}: {!s}'.format(name, namespace, csc_key, exc)
            )

        return csc_object

    def update(self, name, namespace, patch):
        try:
            response = self.client.patch_namespaced_config_map(
                name, namespace, patch
            )
        except Exception as exc:
            pytest.fail(
                "Unable to patch ConfigMap {} in namespace {} with error {!s}"
                .format(name, namespace, exc)
            )

        return response


# }}}
