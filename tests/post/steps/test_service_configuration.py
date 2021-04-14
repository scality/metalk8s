from ast import literal_eval
import copy
import yaml

import pytest
from pytest_bdd import scenario, given, then, when, parsers

from kubernetes.client import AppsV1Api

from tests import utils

# Scenarios {{{


@scenario(
    "../features/service_configuration.feature",
    "Propagation of Service Configurations to underlying Services",
)
def test_service_config_propagation(host):
    pass


@scenario(
    "../features/service_configuration.feature", "Update Admin static user password"
)
def test_static_user_change(host):
    pass


@scenario(
    "../features/service_configuration.feature",
    "Customization of pre-defined Prometheus rules",
)
def test_prometheus_rules_customization(host):
    pass


# }}}
# Given {{{


@given(parsers.parse("we have a '{name}' CSC in namespace '{namespace}'"))
def csc(host, ssh_config, version, k8s_client, name, namespace):
    """Retrieve the content of a CSC"""
    csc_obj = ClusterServiceConfiguration(
        k8s_client,
        name,
        namespace,
        host,
        ssh_config,
        version,
    )
    csc_content = csc_obj.get()

    assert csc_content, "No ConfigMap with name {} in namespace {} found".format(
        name, namespace
    )

    yield csc_obj

    csc_obj.restore()


# }}}
# When {{{


@when(parsers.parse("we update the CSC '{path}' to '{value}'"))
def update_csc(csc, path, value):
    csc_content = csc.get()
    utils.set_dict_element(csc_content, path, value)
    csc.update(csc_content, apply_config=False)


@when(parsers.parse("we apply the '{state}' state"))
def apply_csc(csc, state):
    csc.apply(state)


# }}}
# Then {{{


@then(
    parsers.parse(
        "we have '{value}' at '{path}' for '{deployment}' Deployment in "
        "namespace '{namespace}'"
    )
)
def get_deployments(
    k8s_apiclient,
    value,
    path,
    deployment,
    namespace,
):
    def _wait_for_deployment():
        try:
            k8s_appsv1_client = AppsV1Api(api_client=k8s_apiclient)
            response = k8s_appsv1_client.read_namespaced_deployment(
                name=deployment, namespace=namespace
            ).to_dict()
        except Exception as exc:
            pytest.fail(
                "Unable to read {} Deployment with error: {!s}".format(deployment, exc)
            )
        assert literal_eval(value) == utils.get_dict_element(
            response, path
        ), "Expected value {} for deployment {}, got {}".format(
            value, deployment, utils.get_dict_element(response, path)
        )

    utils.retry(
        _wait_for_deployment, times=10, wait=5, name="wait for available Deployments"
    )


@then(
    parsers.parse(
        "we have an alert rule '{rule_name}' in group '{group_name}' with "
        "severity '{severity}' and '{path}' equal to '{value}'"
    )
)
def check_prometheus_alert_rule(
    prometheus_api, rule_name, group_name, severity, path, value
):
    """Retrieve an alert rule from the Prometheus API, then
    checks if the given path matches the value.
    """

    def _wait_prometheus_config_reload():
        try:
            rules = prometheus_api.find_rules(
                rule_name, group_name, {"severity": severity}
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
        name="wait for Prometheus configuration reload",
    )


# }}}
# Helpers {{{


class ClusterServiceConfigurationError(Exception):
    pass


class ClusterServiceConfiguration:
    CSC_KEY = "config.yaml"

    def __init__(self, k8s_client, name, namespace, host, ssh_config, version):
        self.client = k8s_client
        self.name = name
        self.namespace = namespace
        self.host = host
        self.ssh_config = ssh_config
        self.version = version
        self.csc = None
        self._csc_origin = None

    def get(self):
        if self.csc:
            return self.csc

        try:
            response = self.client.read_namespaced_config_map(self.name, self.namespace)
        except Exception as exc:
            raise ClusterServiceConfigurationError(
                "Unable to read {} ConfigMap in namespace {} with error: {!s}".format(
                    self.name, self.namespace, exc
                )
            )

        try:
            csc_data = response.data[self.CSC_KEY]
        except KeyError:
            raise ClusterServiceConfigurationError(
                "Missing 'data.{}' key in '{}' ConfigMap in namespace '{}'".format(
                    self.CSC_KEY, self.name, self.namespace
                )
            )

        try:
            self.csc = yaml.safe_load(csc_data)
        except yaml.YAMLError as exc:
            raise ClusterServiceConfigurationError(
                "Invalid YAML format in ConfigMap {} in Namespace {} under "
                "key {}: {!s}".format(self.name, self.namespace, self.CSC_KEY, exc)
            )

        self._csc_origin = copy.deepcopy(self.csc)

        return self.csc

    def apply(self, state="metalk8s.deployed"):
        cmd = [
            "salt-run",
            "state.sls",
            state,
            "saltenv=metalk8s-{}".format(self.version),
            "--log-level=warning",
            "--out=json",
        ]

        utils.run_salt_command(self.host, cmd, self.ssh_config)

    def update(self, config, apply_config=True):
        patch = {
            "data": {self.CSC_KEY: yaml.safe_dump(config, default_flow_style=False)}
        }

        try:
            self.client.patch_namespaced_config_map(self.name, self.namespace, patch)
        except Exception as exc:
            raise ClusterServiceConfigurationError(
                "Unable to patch ConfigMap {} in namespace {} with error {!s}".format(
                    self.name, self.namespace, exc
                )
            )

        self.csc = config

        if apply_config:
            self.apply()

    def restore(self):
        """ """
        self.update(self._csc_origin)


# }}}
