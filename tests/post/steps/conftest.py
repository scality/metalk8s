# -*- coding: utf-8 -*-
from pytest_bdd import (
    given,
    then,
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


# Pytest-bdd steps

# Given
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


# Then
@then("the Kubernetes API is available")
def verify_kubeapi_service(host):
    _verify_kubeapi_service(host)
