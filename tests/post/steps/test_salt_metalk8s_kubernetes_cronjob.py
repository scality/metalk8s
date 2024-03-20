import json
import os

from kubernetes.client.rest import ApiException
import pytest
from pytest_bdd import parsers, scenario, given, then, when
import yaml

from tests.utils import negation, run_salt_command, retry


# Fixtures {{{


@pytest.fixture(scope="function")
def context():
    return {}


# }}}
# Scenario {{{


@scenario(
    "../features/salt_metalk8s_kubernetes_cronjob.feature",
    "Ensure the test CronJob is present",
)
def test_ensure_the_test_cronjob_is_present(host):
    pass


@scenario(
    "../features/salt_metalk8s_kubernetes_cronjob.feature",
    "Suspend and activate a CronJob",
)
def test_suspend_cronjob(host):
    pass


@scenario(
    "../features/salt_metalk8s_kubernetes_cronjob.feature",
    "Stop the Cronjob and delete all its Jobs",
)
def test_suspend_cronjob_delete_jobs(host):
    pass


# }}}
# Given {{{


@given(
    parsers.parse("the '{cronjob_name}' CronJob is created"),
)
def call_metalk8s_kubernetes_cronjob_create_test_cronjob(
    k8s_client, cronjob_name, utils_image
):
    cj_manifest_file = os.path.join(
        os.path.realpath(os.path.dirname(__file__)), "files", "cronjob.yaml"
    )
    with open(cj_manifest_file, encoding="utf-8") as fd:
        cj_manifest = yaml.safe_load(fd)
    cj_manifest["metadata"] = {"name": cronjob_name}
    cj_manifest["spec"]["jobTemplate"]["spec"]["template"]["spec"]["containers"][0][
        "image"
    ] = utils_image
    cj_k8s_client = k8s_client.resources.get(api_version="batch/v1", kind="CronJob")
    cj_k8s_client.create(body=cj_manifest, namespace="default")

    yield

    try:
        cj_k8s_client.delete(name=cronjob_name, namespace="default")
    except ApiException as exc:
        assert exc.status == 404, f"CronJob {cronjob_name} still exists"


@given(
    parsers.parse(
        "we poll the '{cronjob_name}' CronJob until it has jobs "
        "or fail after {timeout:d} seconds",
    ),
)
def poll_get_jobs(host, ssh_config, context, cronjob_name, timeout):
    def _wait_get_jobs():
        call_metalk8s_kubernetes_cronjob_get_jobs(
            host, ssh_config, context, cronjob_name
        )
        assert (
            context[f"{cronjob_name}_jobs"],
            f"CronJob {cronjob_name} has no jobs after {timeout} seconds",
        )

    retry(_wait_get_jobs, times=int(timeout / 10), wait=10)


# }}}
# When {{{


@when(
    parsers.parse("we list the '{state}' CronJobs"),
)
def call_metalk8s_kubernetes_cronjob_get_cronjobs(host, ssh_config, context, state):
    if state not in ["active", "suspended"]:
        raise ValueError(f"Invalid silence state: {state}")
    command = [
        "salt-run",
        "salt.cmd",
        "metalk8s_kubernetes_cronjob.get_cronjobs",
        "namespace=default",
        # True if suspended, false if active
        f"suspended={state == 'suspended'}",
        "--out json",
        "--log-level quiet",
    ]
    result = run_salt_command(
        host,
        command,
        ssh_config,
    )
    context[f"cronjobs_{state}"] = json.loads(result.stdout)


@when(
    parsers.parse(
        "we suspend the '{cronjob_name}' CronJob marking it with '{suspend_mark}'",
    ),
)
def call_metalk8s_kubernetes_cronjob_suspend_cronjob(
    host,
    ssh_config,
    cronjob_name,
    suspend_mark,
):
    command = [
        "salt-run",
        "salt.cmd",
        "metalk8s_kubernetes_cronjob.suspend_cronjob",
        f"name={cronjob_name}",
        "namespace=default",
        f"mark={suspend_mark}",
        "--out json",
        "--log-level quiet",
    ]
    result = run_salt_command(
        host,
        command,
        ssh_config,
    )
    assert json.loads(result.stdout) is True, "Failed to suspend the CronJob"


@when(
    parsers.parse("we activate the '{cronjob_name}' Cronjob"),
)
def call_metalk8s_kubernetes_cronjob_activate_cronjob(host, ssh_config, cronjob_name):
    command = [
        "salt-run",
        "salt.cmd",
        "metalk8s_kubernetes_cronjob.activate_cronjob",
        f"name={cronjob_name}",
        "namespace=default",
        "--out json",
        "--log-level quiet",
    ]
    result = run_salt_command(
        host,
        command,
        ssh_config,
    )
    assert json.loads(result.stdout) == True, "Failed to activate the CronJob"


@when(
    parsers.parse(
        "we stop the '{cronjob_name}' CronJob marked with '{suspend_mark}' "
        "and delete all its Jobs"
    ),
)
def call_metalk8s_kubernetes_cronjob_suspend_cronjob_and_delete_jobs(
    host, ssh_config, context, cronjob_name, suspend_mark
):
    command = [
        "salt-run",
        "salt.cmd",
        "metalk8s_kubernetes_cronjob.suspend_cronjob_and_delete_jobs",
        f"name={cronjob_name}",
        "namespace=default",
        f"mark={suspend_mark}",
        "wait=true",
        "--out json",
        "--log-level quiet",
    ]

    result = run_salt_command(
        host,
        command,
        ssh_config,
    )
    context["deleted_jobs"] = json.loads(result.stdout)


@when(
    parsers.parse("we look for the '{cronjob_name}' CronJobs Jobs"),
)
def call_metalk8s_kubernetes_cronjob_get_jobs(host, ssh_config, context, cronjob_name):
    command = [
        "salt-run",
        "salt.cmd",
        "metalk8s_kubernetes_cronjob.get_jobs",
        f"name={cronjob_name}",
        "namespace=default",
        "--out json",
        "--log-level quiet",
    ]
    result = run_salt_command(
        host,
        command,
        ssh_config,
    )
    context[f"{cronjob_name}_jobs"] = json.loads(result.stdout)


# }}}
# Then {{{


@then(
    parsers.cfparse(
        "the '{cronjob_name}' CronJob should{negated:Negation?} be "
        "in the list of '{state}' CronJobs",
        extra_types={"Negation": negation},
    ),
)
def confirm_cronjob_presence(context, cronjob_name, negated, state):
    cronjobs = [
        c for c in context[f"cronjobs_{state}"] if c["metadata"]["name"] == cronjob_name
    ]
    if negated:
        assert not cronjobs, "CronJob is in the list of suspended CronJobs"
    else:
        assert cronjobs, "CronJob is not in the list of suspended CronJobs"
        context[f"cronjob_{cronjob_name}"] = cronjobs[0]


@then(
    parsers.re(
        r"the '(?P<cronjob_name>.*)' CronJob should(?P<negated>(not| not)?) "
        r"be marked( with '(?P<suspend_mark>.*)')?",
    ),
    converters={"cronjob_name": str, "negated": negation, "suspend_mark": str},
)
def get_suspend_mark(context, cronjob_name, negated, suspend_mark):
    cronjob = context[f"cronjob_{cronjob_name}"]
    suspend_annotation = (
        cronjob.get("metadata", {})
        .get("annotations", {})
        .get("metalk8s.scality.com/suspend_mark")
    )
    if negated:
        assert not suspend_annotation, "CronJob has a suspend_mark"
    else:
        assert (
            suspend_annotation == suspend_mark
        ), "CronJob does not have a suspend_mark"


@then(
    parsers.cfparse(
        "the '{cronjob_name}' jobs should{negated:Negation?} be empty",
        extra_types={"Negation": negation},
    )
)
def get_jobs(context, negated, cronjob_name):
    if negated:
        assert context[f"{cronjob_name}_jobs"], f"{cronjob_name} jobs are empty"
    else:
        assert not context[f"{cronjob_name}_jobs"], f"{cronjob_name} jobs are not empty"


# }}}
