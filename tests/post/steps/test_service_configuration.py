from ast import literal_eval
import yaml

import pytest
from pytest_bdd import scenario, given, then, when, parsers

import kubernetes.client
from kubernetes.client import AppsV1Api
from kubernetes.client.rest import ApiException

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


# }}}


# Given {{{


@given(parsers.parse(
    "we have a '{name}' CSC in namespace '{namespace}' with "
    "'{path}' equal to '{value}'"))
def check_csc_configuration(
    k8s_client,
    csc,
    name,
    namespace,
    path,
    value
):
    csc_response = csc.get(name, namespace)

    assert csc_response, (
        "No ConfigMap with name {} in namespace {} found".format(
            name, namespace
        )
    )

    csc_obj = csc.load(csc_response, name, namespace)
    response_value = utils.get_dict_element(csc_obj, path)

    assert literal_eval(value) == response_value, (
        "Expected value {} for key {} in ConfigMap {} found in namespace {}, "
        "got {}".format(value, path, name, namespace, response_value)
    )
    return dict(csc_obj=csc_obj)


# }}}


# When {{{


@when(parsers.parse(
    "we update '{name}' CSC in namespace '{namespace}' "
    "'{path}' to '{value}'"))
def update_service_configuration(
    k8s_client,
    csc,
    name,
    namespace,
    path,
    value
):

    full_csc = csc.get(name, namespace)
    csc_obj = utils.set_dict_element(
        csc.load(full_csc, name, namespace), path, literal_eval(value)
    )
    patch = {
        'data': {
            'config.yaml': yaml.safe_dump(
                csc_obj, default_flow_style=False
            )
        }
    }
    response = csc.update(name, namespace, patch)

    assert response

    patched_csc = csc.get(name, namespace)
    patched_value = utils.get_dict_element(
        csc.load(patched_csc, name, namespace), path
    )

    assert literal_eval(value) == patched_value, (
        "Expected value {} for key {} in ConfigMap {} found in namespace {}, "
        "got {}".format(value, path, name, namespace, patched_value)
    )


@when(parsers.parse("we apply the '{state}' salt state"))
def apply_service_config(host, version, request, k8s_client, state):
    ssh_config = request.config.getoption('--ssh-config')

    cmd = [
        'salt-run', 'state.sls', '{}'.format(state),
        'saltenv=metalk8s-{}'.format(version)
    ]
    utils.run_salt_command(host, cmd, ssh_config)


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
                "Unable to read {} ConfigMap  in namespace {} with error: {!s}"
                .format(name, namespace, exc)
            )
        return response

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

    def load(self, full_csc, name, namespace):
        try:
            csc_obj = yaml.safe_load(full_csc.data['config.yaml'])
        except yaml.YAMLError as exc:
            raise Exception(
                'Invalid YAML format in ConfigMap {} found in namespace {}: {!s}'
                .format(name, namespace, exc)
            )
        except Exception as exc:
            raise Exception(
                "Failed loading `config.yaml` from ConfigMap {} in namespace {}: "
                "{!s}".format(name, namespace, exc)
            )
        return csc_obj


# }}}
