from pytest_bdd import scenario, then

# Scenarios
@scenario('../features/log_accessible.feature', 'get logs')
def test_logs(host):
    pass


@then("the pods logs should not be empty")
def check_logs(host):
    with host.sudo():
        cmd = ('kubectl --kubeconfig=/etc/kubernetes/admin.conf'
               ' get pods -n kube-system'
               ' --no-headers -o custom-columns=":metadata.name"')
        pods_list = host.check_output(cmd)
        for pod_id in pods_list.split('\n'):
            cmd_logs = ('kubectl --kubeconfig=/etc/kubernetes/admin.conf'
                        ' logs {} --limit-bytes=1 -n kube-system'.format(
                            pod_id))
            res = host.check_output(cmd_logs)
            if 'salt-master' not in pod_id:
                assert len(res.strip()) > 0, (
                    'Error cannot retrieve logs for {}'.format(pod_id))
