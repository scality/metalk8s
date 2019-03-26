import json
import time

import pytest
from pytest_bdd import scenario, then, parsers


# Scenarios
@scenario('../features/pods_alive.feature', 'List Pods')
def test_list_pods(host):
    pass


@scenario('../features/pods_alive.feature', 'Exec in Pods')
def test_exec_in_pods(host):
    pass


@scenario('../features/pods_alive.feature', 'Expected Pods')
def test_expected_pods(host):
    pass


# Then
@then(parsers.parse(
    "the '{resource}' list should not be "
    "empty in the '{namespace}' namespace"))
def check_resource_list(host, resource, namespace):
    with host.sudo():
        cmd = ("kubectl --kubeconfig=/etc/kubernetes/admin.conf"
               " get {0} --namespace {1} -o custom-columns=:metadata.name")
        cmd_res = host.check_output(cmd.format(resource, namespace))
    assert len(cmd_res.strip()) > 0, 'No {0} found in namespace {1}'.format(
            resource, namespace)


@then(parsers.parse(
    "we can exec '{command}' in the pod labeled '{label}' "
    "in the '{namespace}' namespace"))
def check_exec(host, command, label, namespace):
    candidates = _get_pods(host, label, namespace)

    assert len(candidates) == 1, (
        "Expected one (and only one) pod with label {l}, found {f}"
    ).format(l=label, f=len(candidates))

    pod = candidates[0]

    cmd = ' '.join([
        'kubectl',
        '--kubeconfig=/etc/kubernetes/admin.conf',
        'exec',
        '--namespace {0}'.format(namespace),
        pod['metadata']['name'],
        command,
    ])

    with host.sudo():
        host.check_output(cmd)


@then(parsers.parse(
    "we have at least {min_pods_count:d} running pod labeled '{label}'"))
def count_running_pods(host, min_pods_count, label):
    # Just after the deployment, the pods may not in running state yet
    # so implement a timeout
    interval = 3
    attempts = 10

    for _ in range(attempts):
        pods = _get_pods(
            host,
            label,
            namespace="kube-system",
            status_phase="Running",
        )

        if len(pods) < min_pods_count:
            time.sleep(interval)
        else:
            # if nb pods is >= then it's ok
            break

    else:
        assert len(pods) >= min_pods_count, (
            "Expected at least {e} running pods labeled with {l} but "
            "found only {f} after waiting {t} seconds"
        ).format(
            e=min_pods_count,
            f=len(pods),
            l=label,
            t=str(interval * attempts)
        )


# Utilities
def _get_pods(host, label, namespace='default', status_phase='Running'):
    cmd = (
        'kubectl --kubeconfig=/etc/kubernetes/admin.conf '
        'get pods -l "{label}" --field-selector=status.phase={status_phase} '
        '--namespace {namespace} -o json'
    ).format(label=label, namespace=namespace, status_phase=status_phase)

    with host.sudo():
        result = host.run(cmd)
        assert result.rc == 0, result.stdout

        return json.loads(result.stdout)['items']
