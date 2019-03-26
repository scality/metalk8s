from pytest_bdd import scenario, then, parsers
from contextlib import contextmanager
from kubernetes import client, config
import os
import time
import yaml


@contextmanager
def run_inside_busybox(kubeconfig_file):
    config.load_kube_config(config_file=kubeconfig_file)
    k8s_client = client.CoreV1Api()

    # Create the busybox pod
    pod_manifest = os.path.join(
        os.path.realpath(os.path.dirname(__file__)),
        "files",
        "busybox.yaml"
    )
    with open(pod_manifest, encoding='utf-8') as pod_fd:
        pod_manifest_content = yaml.safe_load(pod_fd)
        k8s_client.create_namespaced_pod(
            body=pod_manifest_content, namespace="default")

    # Wait for the busybox to be ready
    timeout = 10
    while True:
        timeout -= 1
        resp = k8s_client.read_namespaced_pod(
            name="busybox", namespace="default")
        if resp.status.phase != "Pending" or timeout == 0:
            break
        time.sleep(1)

    yield "busybox"

    # Clean-up resources
    k8s_client.delete_namespaced_pod(
        name="busybox",
        namespace="default",
        body=client.V1DeleteOptions(),
    )

# Scenarios
@scenario('../features/dns_resolution.feature', 'check dns')
def test_dns(host):
    pass


@then(parsers.parse("The hostname '{hostname}' should be resolved"))
def resolve_hostname(kubeconfig, host, hostname):
    with run_inside_busybox(kubeconfig) as pod_name:
        with host.sudo():
            # test dns resolve
            cmd_nslookup = ("kubectl --kubeconfig=/etc/kubernetes/admin.conf"
                            " exec -ti {0} nslookup {1}".format(
                                pod_name,
                                hostname))
            res = host.run(cmd_nslookup)
            assert res.rc == 0, "Cannot resolve {}".format(hostname)
