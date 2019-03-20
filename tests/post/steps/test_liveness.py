import json
import time

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
    "we can exec '{command}' in the "
    "'{pod}' pod in the '{namespace}' namespace"))
def check_exec(host, command, pod, namespace):
    cmd = ' '.join([
        'kubectl',
        '--kubeconfig=/etc/kubernetes/admin.conf',
        'exec',
        '--namespace {0}'.format(namespace),
        pod,
        command,
    ])

    with host.sudo():
        host.check_output(cmd)


@then(
    parsers.parse(
        "we have at least {min_pods_count:d} running pod labeled '{label}'"
    )
)
def count_running_pods(host, min_pods_count, label):
    cmd = (
        'kubectl --kubeconfig=/etc/kubernetes/admin.conf '
        'get pod -l "{label}" --field-selector=status.phase=Running '
        '--namespace kube-system -o json'
    ).format(label=label)

    # Just after the deployment, the pods may not in running state yet
    # so implement a timeout
    interval = 3
    attempts = 10

    with host.sudo():
        for _ in range(attempts):

            ret = host.run(cmd)
            assert ret.rc == 0, ret.stdout

            pods = json.loads(ret.stdout)

            if len(pods['items']) < min_pods_count:
                time.sleep(interval)
            else:
                # if nb pods is >= then it's ok
                break

        else:
            assert len(pods['items']) == min_pods_count, \
                ("Expected at least {e} running pods labeled with {l} but "
                 "found only {f} after waiting {t} seconds").format(
                     e=min_pods_count,
                     f=len(pods['items']),
                     l=label,
                     t=str(interval * attempts))
