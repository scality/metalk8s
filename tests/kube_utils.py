from kubernetes.client.rest import ApiException

from tests import utils


def get_pods(
    k8s_client, ssh_config, label,
    node='bootstrap', namespace='default', state='Running'
):
    """Return the pod `component` from the specified node"""

    field_selector = ['status.phase={}'.format(state)]

    if node:
        nodename = utils.resolve_hostname(node, ssh_config)
        field_selector.append('spec.nodeName={}'.format(nodename))

    return k8s_client.list_namespaced_pod(
        namespace,
        field_selector=','.join(field_selector),
        label_selector=label
    ).items


def check_pod_status(k8s_client, name, namespace="default", state="Running"):
    """Helper to generate a simple assertion method to check a Pod state.

    It is designed to be used with `tests.utils.retry`, and handles 404
    exceptions as transient (i.e. raises an `AssertionError` for a later
    `retry`).
    """

    def _check_pod_status():
        try:
            pod = k8s_client.read_namespaced_pod(
                name=name, namespace=namespace
            )
        except ApiException as err:
            if err.status == 404:
                raise AssertionError("Pod not yet created")
            raise

        assert pod.status.phase == state, "Pod not yet '{}'".format(state)

        return pod

    return _check_pod_status
