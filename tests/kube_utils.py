import json

from kubernetes.client.rest import ApiException


def get_pods(host, label, namespace="default", status_phase="Running"):
    with host.sudo():
        result = host.run(
            "kubectl --kubeconfig=/etc/kubernetes/admin.conf "
            'get pods -l "%s" --field-selector=status.phase=%s '
            "--namespace %s -o json",
            label,
            status_phase,
            namespace,
        )
        assert result.rc == 0, result.stdout

        return json.loads(result.stdout)["items"]


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
