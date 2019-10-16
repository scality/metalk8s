# coding: utf-8
from pytest_bdd import given, parsers

from tests import kube_utils, utils


# Given {{{

@given(parsers.parse("pods with label '{label}' are '{state}'"))
def check_pod_state(request, host, k8s_client, label, state):
    ssh_config = request.config.getoption('--ssh-config')

    # Helper to use retry utils
    def _wait_for_state():
        pods = kube_utils.get_pods(
            k8s_client, ssh_config, label,
            namespace="kube-system", state="Running"
        )
        assert pods
        return pods

    # Wait for pod to be in the correct state
    pods = utils.retry(
        _wait_for_state,
        times=12,
        wait=5,
        name="wait for pods with label '{}'".format(label)
    )

    assert pods, "No {} pod with label '{}' found".format(
        state.lower(), label
    )


# }}}
