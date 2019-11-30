# coding: utf-8
from pytest_bdd import given, parsers

from tests import kube_utils, utils


# Given {{{

@given(parsers.parse("pods with label '{label}' are '{expected_status}'"))
def check_pod_status(request, host, k8s_client, label, expected_status):
    ssh_config = request.config.getoption('--ssh-config')

    # Helper to use retry utils
    def _wait_for_status():
        pods = kube_utils.get_pods(
            k8s_client, ssh_config, label,
            namespace="kube-system", state="Running"
        )
        assert pods

        for pod in pods:
            # If really not ready, status may not have been pushed yet.
            if pod.status.conditions is None:
                assert expected_status == 'NotReady'
                continue

            for condition in pod.status.conditions:
                if condition.type == 'Ready':
                    break
            assert kube_utils.MAP_STATUS[condition.status] == expected_status

        return pods

    # Wait for pod to be in the correct state
    pods = utils.retry(
        _wait_for_status,
        times=12,
        wait=5,
        name="wait for pods with label '{}'".format(label)
    )

    assert pods, "No {} pod with label '{}' found".format(
        expected_status.lower(), label
    )


# }}}
