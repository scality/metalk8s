from kubernetes.client.rest import ApiException

from tests import utils

# See https://kubernetes.io/docs/concepts/architecture/nodes/#condition
# And https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-conditions
MAP_STATUS = {
    'True': 'Ready', 'False': 'NotReady', 'Unknown': 'Unknown'
}


def get_pods(
    k8s_client, ssh_config, label=None,
    node=None, namespace=None, state='Running'
):
    """Return the pod `component` from the specified node"""
    field_selector = []

    if state:
        field_selector.append('status.phase={}'.format(state))

    if node:
        nodename = utils.resolve_hostname(node, ssh_config)
        field_selector.append('spec.nodeName={}'.format(nodename))

    kwargs = {}

    if field_selector:
        kwargs['field_selector'] = ','.join(field_selector)

    if label:
        kwargs['label_selector'] = label

    if namespace:
        return k8s_client.list_namespaced_pod(
            namespace=namespace, **kwargs
        ).items
    return k8s_client.list_pod_for_all_namespaces(**kwargs).items


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

        return pod

    return _wait_for_pod
