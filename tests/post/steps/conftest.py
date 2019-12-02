# coding: utf-8
from pytest_bdd import given, parsers

from tests import kube_utils, utils


# Helpers {{{

def _check_pods_status(k8s_client, expected_status, ssh_config,
                       namespace=None, label=None):
    # Helper to use retry utils
    def _wait_for_status():
        pods = kube_utils.get_pods(
            k8s_client, ssh_config, label,
            namespace=namespace
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

    name = "wait for pods"
    if namespace:
        name += " in namespace {}".format(namespace)
    else:
        name += " in all namespaces"
    if label:
        name += " with label '{}'".format(label)

    # Wait for pod to be in the correct state
    utils.retry(
        _wait_for_status,
        times=12,
        wait=5,
        name=name
    )

# }}}
# Given {{{


@given(parsers.parse("pods with label '{label}' are '{expected_status}'"))
def check_pod_status(request, host, k8s_client, label, expected_status):
    ssh_config = request.config.getoption('--ssh-config')

    _check_pods_status(
        k8s_client, expected_status, ssh_config, label=label
    )


@given(parsers.parse("all Pod are '{expected_status}'"))
def check_all_pods_status(request, host, k8s_client, expected_status):
    ssh_config = request.config.getoption('--ssh-config')

    _check_pods_status(
        k8s_client, expected_status, ssh_config
    )
# }}}
