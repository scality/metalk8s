from pytest_bdd import scenario, then

# Scenarios
@scenario('../features/log_accessible.feature', 'get logs')
def test_logs(host):
    pass


@then("the pods logs should not be empty")
def check_logs(host):
    with host.sudo():
        pods_list = host.check_output(
            'kubectl --kubeconfig=/etc/kubernetes/admin.conf '
            'get pods -n kube-system '
            '--no-headers -o custom-columns=":metadata.name"'
        )
        for pod_id in pods_list.split('\n'):
            # The `salt-master` Pod gets skipped for two reasons:
            #
            # - We run two containers in the Pod (`salt-master` and `salt-api`),
            #   which breaks the fairly simple `kubectl logs` invocation below
            # - More importantly, when running this test, there may be no logs
            #   from either one of those containers:
            #
            #   * `salt-master` only logs above `INFO` level, so no lines may be
            #     emitted.
            #   $ `salt-api` may not have been called at all, and as such not
            #     have logged anything.
            if 'salt-master' in pod_id:
                continue

            pod_logs = host.check_output(
                'kubectl --kubeconfig=/etc/kubernetes/admin.conf '
                'logs %s --limit-bytes=1 -n kube-system',
                pod_id,
            )

            assert len(pod_logs.strip()) > 0, (
                'Error cannot retrieve logs for {}'.format(pod_id))
