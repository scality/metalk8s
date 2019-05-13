# -*- coding: utf-8 -*-
from pytest_bdd import (
    given,
    then,
    when,
    parsers,
)

from tests import kube_utils


# Helpers
def _verify_kubeapi_service(host):
    """Verify that the kubeapi service answer"""
    with host.sudo():
        cmd = "kubectl --kubeconfig=/etc/kubernetes/admin.conf cluster-info"
        retcode = host.run(cmd).rc
        assert retcode == 0


def _run_bootstrap(request, host):
    # FIXME: this can only run on the bootstrap node, we'd need to skip such
    #        test if the host fixture is not adapted
    iso_root = request.config.getoption("--iso-root")
    cmd = str(iso_root / "bootstrap.sh")
    with host.sudo():
        res = host.run(cmd)
        assert res.rc == 0, res.stdout


# Pytest-bdd steps

# Given
@given('bootstrap was run once')
def run_bootstrap(request, host):
    _run_bootstrap(request, host)


@given("the Kubernetes API is available")
def check_service(host):
    _verify_kubeapi_service(host)


@given(parsers.parse("pods with label '{label}' are '{state}'"))
def check_pod_state(host, label, state):
    pods = kube_utils.get_pods(
        host, label, namespace="kube-system", status_phase="Running",
    )

    assert len(pods) > 0, "No {} pod with label '{}' found".format(
        state.lower(), label
    )


# When
@when('we run bootstrap a second time')
def rerun_bootstrap(request, host):
    _run_bootstrap(request, host)


# Then
@then("the Kubernetes API is available")
def verify_kubeapi_service(host):
    _verify_kubeapi_service(host)
