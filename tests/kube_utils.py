import json

import testinfra
from kubernetes.client.rest import ApiException


def get_pods(
    k8s_client, ssh_config, label,
    node='bootstrap', namespace='default', state='Running'
):
    """Return the pod `component` from the specified node"""
    # Resolve a node name (from SSH config) to a real hostname.
    node = testinfra.get_host(node, ssh_config=ssh_config)
    hostname = node.check_output('hostname')

    field_selector = 'spec.nodeName={},status.phase={}'.format(hostname, state)
    return k8s_client.list_namespaced_pod(
        namespace, field_selector=field_selector, label_selector=label
    ).items


def wait_for_pod(k8s_client, name, namespace="default", state="Running"):
    """Helper to generate a simple assertion method to check a Pod state.

    It is designed to be used with `tests.utils.retry`, and handles 404
    exceptions as transient (i.e. raises an `AssertionError` for a later
    `retry`).
    """

    def _wait_for_pod():
        try:
            pod = k8s_client.read_namespaced_pod(
                name=name, namespace=namespace
            )
        except ApiException as err:
            if err.status == 404:
                raise AssertionError("Pod not yet created")
            raise

        assert pod.status.phase == state, "Pod not yet '{}'".format(state)

    return _wait_for_pod
