import json


def get_pods(host, label, namespace='default', status_phase='Running'):
    with host.sudo():
        result = host.run(
            'kubectl --kubeconfig=/etc/kubernetes/admin.conf '
            'get pods -l "%s" --field-selector=status.phase=%s '
            '--namespace %s -o json',
            label,
            status_phase,
            namespace,
        )
        assert result.rc == 0, result.stdout

        return json.loads(result.stdout)['items']
