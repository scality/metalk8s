import json
from ast import literal_eval

import requests
import requests.exceptions

import pytest
from pytest_bdd import scenario, given, then, when, parsers

from kubernetes.client.rest import ApiException

from tests import kube_utils
from tests import utils

# Constants {{{

DEFAULT_SOLUTION_MOUNTPOINT = "/srv/scality"
SOLUTION_PILLAR_KEY = "metalk8s:solutions:available"
SOLUTION_CONFIGURATION_FILE = "/etc/metalk8s/solutions.yaml"
INFRA_TAINT = "node-role.kubernetes.io/infra:NoSchedule-"
BOOTSTRAP_TAINT = "node-role.kubernetes.io/bootstrap:NoSchedule-"
SOLUTION_CONFIGMAP = "metalk8s-solutions"
SOLUTION_NAMESPACE = "metalk8s-solutions"
ENVIRONMENT_LABEL = "solutions.metalk8s.scality.com/environment"

# }}}

# Fixtures {{{


@pytest.fixture(scope="function")
def context():
    return {}


# }}}


# Scenarios {{{


@scenario("../features/solutions.feature", "Deploy Solution")
def test_deploy_solution(host):
    pass


# }}}


# Given {{{


@given(parsers.parse("no Solution '{name}' is imported"))
def is_absent_solution(host, name):
    with host.sudo():
        assert (
            name not in host.mount_point.get_mountpoints()
        ), "Solution mountpoint {} exists".format(name)


@given(parsers.parse("no Solution environment '{environment}' is available"))
def is_absent_solution_environment(host, environment, k8s_client):
    solution_environment = get_environment(k8s_client, environment)
    assert (
        environment not in solution_environment
    ), "Solution environment {} exists".format(environment)


@given(parsers.parse("the Solution Configuration file is absent"))
def is_absent_solution_config(host):
    with host.sudo():
        if host.file(SOLUTION_CONFIGURATION_FILE).exists:
            assert False, "Solution Config file exists at path {}".format(
                SOLUTION_CONFIGURATION_FILE
            )


# }}}


# When {{{


@when(parsers.parse("we import a Solution archive '{path}'"))
def import_solution(request, host, path):
    run_solutions_command(request, host, ["import", "--archive", path])


@when(parsers.parse("we activate Solution '{name}' version '{version}'"))
def activate_example_solution(request, host, name, version):
    run_solutions_command(
        request, host, ["activate", "--name", name, "--version", version]
    )


@when(parsers.parse("we create a solution environment '{environment}'"))
def create_solution_environment(request, host, environment):
    run_solutions_command(request, host, ["create-env", "--name", environment])


@when(parsers.parse("we remove Taints on node '{node_name}' before deployment"))
def remove_node_taints(request, host, node_name):
    # Remove Taints on the Bootstrap node before deploying
    # example-solution-operator else, the operator pods will not startup

    with host.sudo():
        res = host.run(
            (
                "kubectl --kubeconfig=/etc/kubernetes/admin.conf " "taint nodes {} {}"
            ).format(node_name, BOOTSTRAP_TAINT)
        )
        assert res.rc == 0, res.stdout

    with host.sudo():
        res = host.run(
            (
                "kubectl --kubeconfig=/etc/kubernetes/admin.conf " "taint nodes {} {}"
            ).format(node_name, INFRA_TAINT)
        )
        assert res.rc == 0, res.stdout


@when(
    parsers.parse(
        "we deploy Solution '{name}' in environment '{environment}' with version "
        "'{solution_version}'"
    )
)
def deploy_solution(request, host, name, environment, solution_version):
    run_solutions_command(
        request,
        host,
        [
            "add-solution",
            "--name",
            environment,
            "--solution",
            name,
            "--version",
            solution_version,
        ],
    )


@when(parsers.parse("we deactivate Solution '{name}'"))
def deactivate_solution(request, host, name):
    run_solutions_command(request, host, ["deactivate", "--name", name])


@when(parsers.parse("we delete Solution '{name}' in environment '{environment}'"))
def delete_solution(host, request, name, environment):
    run_solutions_command(
        request, host, ["delete-solution", "--name", environment, "--solution", name]
    )


@when(parsers.parse("we delete Solution environment '{environment}'"))
def delete_solution_env(host, request, environment):
    run_solutions_command(request, host, ["delete-env", "--name", environment])


@when(parsers.parse("we unimport Solution archive '{path}'"))
def unimport_solution_archive(host, request, path):
    run_solutions_command(request, host, ["unimport", "--archive", path])


@when("we delete the Solution Configuration file")
def remove_solution_config(host, request):
    with host.sudo():
        res = host.run(("rm -rf {}").format(SOLUTION_CONFIGURATION_FILE))
        assert res.rc == 0, res.stdout


# }}}


# Then {{{


@then(parsers.parse("Solution archive '{name}' is imported correctly"))
def is_imported_solution_archive(host, k8s_client, name):
    # Solution is imported correctly if
    # 1. Solution Configuration is created at /etc/metalk8s/solution.yaml
    # 2. Solution Configuration file has new archive path
    # 3. Solutions ConfigMap has the new Solution imported
    with host.sudo():
        assert host.file(
            SOLUTION_CONFIGURATION_FILE
        ).exists, "No Solution Configuration file exists at {}".format(
            SOLUTION_CONFIGURATION_FILE
        )
    # Todo: SOLUTION_CONFIGURATION_FILE is yaml, we could parse it
    # and ensure the archive path is at the right location
    with host.sudo():
        assert (
            name in host.file(SOLUTION_CONFIGURATION_FILE).content_string
        ), "No {} Solution ISO path found in Solution Config {}".format(
            name, SOLUTION_CONFIGURATION_FILE
        )

    def _wait_for_imported_archive():

        configmap = get_configmap(k8s_client, SOLUTION_CONFIGMAP, SOLUTION_NAMESPACE)
        assert configmap is not None, "Failed to read Solution ConfigMap {}".format(
            SOLUTION_CONFIGMAP
        )

        data = configmap.get("data", {})
        assert any(
            k == name for k, v in data.items()
        ), "{} Configmap does not contain solution {}".format(SOLUTION_CONFIGMAP, name)

    utils.retry(
        _wait_for_imported_archive, times=10, wait=5, name="wait for imported archive"
    )


@then(parsers.parse("Solution '{name}' version '{solution_version}' is available"))
def is_available_solution(host, request, name, solution_version):
    available_solution = get_available_solution(host)
    assert name in available_solution
    for k, v in available_solution.items():
        if k == name:
            for item in v:
                assert (
                    item.get("version", None) == solution_version
                ), "Expected solution version {}: got {}".format(
                    solution_version, item.get("version", None)
                )


@then(parsers.parse("Solution '{name}' version '{solution_version}' is activated"))
def is_activated_solution(host, name, solution_version, k8s_client):
    # Solution is marked activated in Solutions ConfigMap

    def _wait_for_activated_solution():
        configmap = get_configmap(k8s_client, SOLUTION_CONFIGMAP, SOLUTION_NAMESPACE)
        assert name in configmap.get(
            "data", {}
        ), "{} Configmap does not contain {}".format(SOLUTION_CONFIGMAP, name)

        # Solution is marked activated in the Pillars
        available_solutions = get_available_solution(host)
        for k, v in available_solutions.items():
            if k == name:
                assert (
                    any(
                        [
                            item.get("active")
                            and item.get("version") == solution_version
                            for item in v
                        ]
                    )
                    is True
                ), "Solution {} in version {} is not active".format(
                    name, solution_version
                )

    utils.retry(
        _wait_for_activated_solution,
        times=10,
        wait=5,
        name="wait for activated solution",
    )


@then(parsers.parse("CRD '{name}' exists in Kubernetes API"))
def is_available_crds(request, host, name):
    with host.sudo():
        res = host.run(
            ("kubectl --kubeconfig=/etc/kubernetes/admin.conf " "get crd {}").format(
                name
            )
        )
        assert res.rc == 0, res.stdout


@then(parsers.parse("solution environment '{name}' is available"))
def read_solution_environment(k8s_client, name):
    assert (
        get_environment(k8s_client, name) is not None
    ), "Solution environment {} not available".format(name)


@then(parsers.parse("we have no Solution '{name}' archive mounted"))
def no_solution_mountpoint(host, name):
    with host.sudo():
        assert (
            name not in host.mount_point.get_mountpoints()
        ), "Found Solution mountpoint {}".format(name)


@then(parsers.parse("we have no Solution environment '{name}'"))
def no_solution_environment(k8s_client, name):
    assert (
        get_environment(k8s_client, name) is None
    ), "No environment with name {} found".format(name)


@then(parsers.parse("we have no available Solution '{name}'"))
def no_available_solution(host, name):
    assert name not in get_available_solution(
        host
    ), "Solution with name {} found".format(name)


@then("we have no Solution Configuration file present")
def no_solution_config(host):
    with host.sudo():
        if host.file(SOLUTION_CONFIGURATION_FILE).exists:
            assert False, "Solution Configuration file exists at {}".format(
                SOLUTION_CONFIGURATION_FILE
            )


# }}}


# Helper {{{


def get_configmap(k8s_client, name, namespace):
    try:
        response = (
            k8s_client.resources.get(api_version="v1", kind="ConfigMap")
            .get(name=name, namespace=namespace)
            .to_dict()
        )
    except Exception as exc:
        if isinstance(exc, ApiException) and exc.status == 404:
            return None
        raise
    return response


def get_environment(k8s_client, name):
    try:
        response = k8s_client.resources.get(api_version="v1", kind="Namespace").get(
            label_selector="{}={}".format(ENVIRONMENT_LABEL, name)
        )
    except (ApiException) as exc:
        if isinstance(exc, ApiException) and exc.status == 404:
            return None
        raise
    return response.items


def get_available_solution(host):
    def _get_available_solutions_from_pillar():
        with host.sudo():
            output = host.check_output(
                'salt-call --out=json pillar.get "{}"'.format(SOLUTION_PILLAR_KEY)
            )
        data = json.loads(output)["local"]
        assert "_errors" not in data

        return data

    return utils.retry(
        _get_available_solutions_from_pillar,
        times=10,
        wait=2,
        name="getting available Solutions from pillar",
    )


def run_solutions_command(request, host, args):
    iso_root = request.config.getoption("--iso-root")
    cmd = [str(iso_root / "solutions.sh")] + args
    with host.sudo():
        res = host.run(" ".join(cmd))
        assert res.rc == 0, res.stdout


# }}}
