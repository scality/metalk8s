# coding: utf-8
from pytest_bdd import given, parsers

from tests import kube_utils


# Given {{{

@given(parsers.parse("pods with label '{label}' are '{state}'"))
def check_pod_state(request, host, k8s_client, label, state):
    ssh_config = request.config.getoption('--ssh-config')
    pods = kube_utils.get_pods(
        k8s_client, ssh_config, label,
        namespace="kube-system", state="Running",
    )

    assert pods, "No {} pod with label '{}' found".format(
        state.lower(), label
    )


# }}}
