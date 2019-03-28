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
            pod_logs = host.check_output(
                'kubectl --kubeconfig=/etc/kubernetes/admin.conf '
                'logs %s --limit-bytes=1 -n kube-system',
                pod_id,
            )

            if 'salt-master' not in pod_id:
                assert len(pod_logs.strip()) > 0, (
                    'Error cannot retrieve logs for {}'.format(pod_id))
