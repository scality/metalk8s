import json
import pathlib
import re
import requests.exceptions
import time

import kubernetes
import pytest
from pytest_bdd import given, parsers, then, when
import yaml

from tests import kube_utils
from tests import utils


# Pytest command-line options
def pytest_addoption(parser):
    parser.addoption(
        "--iso-root",
        action="store",
        default="_build/root",
        type=pathlib.Path,
        help="Root of the ISO file tree.",
    )


# Fixtures {{{


@pytest.fixture(scope="module")
def version(request, host):
    iso_root = request.config.getoption("--iso-root")
    product_path = iso_root / "product.txt"
    with host.sudo():
        return host.check_output("source %s && echo $VERSION", str(product_path))


@pytest.fixture(scope="module")
def hostname(host):
    """Return the result of `hostname` on the `host` fixture.

    The hostname registered in the SSH config file may not match the one known
    by the server, especially if running tests locally.
    """
    return host.check_output("hostname")


@pytest.fixture(scope="module")
def nodename(host):
    """Return the kubernetes node name of the `host`

    Node name need to be equal to the salt minion id so just retrieve the
    salt minion id
    """
    return utils.get_grain(host, "id")


@pytest.fixture(scope="module")
def control_plane_ip(host):
    """Return the Kubernetes control plane IP based on the salt grain"""
    return utils.get_grain(host, "metalk8s:control_plane_ip")


@pytest.fixture(scope="module")
def kubeconfig_data(request, host):
    """Fixture to generate a kubeconfig file for remote usage."""
    with host.sudo():
        kubeconfig_file = host.file("/etc/kubernetes/admin.conf")
        if not kubeconfig_file.exists:
            pytest.skip(
                "Must be run on bootstrap node, or have an existing file at "
                "/etc/kubernetes/admin.conf"
            )
        return yaml.safe_load(kubeconfig_file.content_string)


@pytest.fixture
def kubeconfig(kubeconfig_data, tmp_path):
    kubeconfig_path = tmp_path / "admin.conf"
    kubeconfig_path.write_text(yaml.dump(kubeconfig_data), encoding="utf-8")
    return str(kubeconfig_path)  # Need Python 3.6 to open() a Path object


@pytest.fixture
def control_plane_ingress_ip(k8s_client):
    """Return the Control Plane Ingress IP from Kubernetes service"""
    ingress_svc = k8s_client.resources.get(api_version="v1", kind="Service").get(
        name="ingress-nginx-control-plane-controller",
        namespace="metalk8s-ingress",
    )
    return ingress_svc.spec.loadBalancerIP or ingress_svc.spec.externalIPs[0]


@pytest.fixture
def control_plane_ingress_ep(k8s_client, control_plane_ingress_ip):
    """Return the Control Plane Ingress Endpoint from Kubernetes service"""
    ingress_svc = k8s_client.resources.get(api_version="v1", kind="Service").get(
        name="ingress-nginx-control-plane-controller",
        namespace="metalk8s-ingress",
    )
    ingress_port = ingress_svc.spec.ports[0].port

    return "https://{}:{}".format(control_plane_ingress_ip, ingress_port)


@pytest.fixture
def k8s_client(request, kubeconfig):
    """Return a DynamicClient to use for interaction with all K8s APIs."""
    k8s_apiclient = kubernetes.config.new_client_from_config(
        config_file=kubeconfig, persist_config=False
    )
    return kubernetes.dynamic.DynamicClient(k8s_apiclient)


@pytest.fixture
def admin_sa(k8s_client):
    """Fixture to create a ServiceAccount which is bind to `cluster-admin`
    ClusterRole and return the ServiceAccount name
    """
    sa_k8s_client = k8s_client.resources.get(api_version="v1", kind="ServiceAccount")
    crb_k8s_client = k8s_client.resources.get(
        api_version="rbac.authorization.k8s.io/v1", kind="ClusterRoleBinding"
    )
    sa_name = "test-admin"
    sa_namespace = "default"
    sa_manifest = {
        "apiVersion": "v1",
        "kind": "ServiceAccount",
        "metadata": {"name": sa_name, "namespace": sa_namespace},
    }
    crb_manifest = {
        "apiVersion": "rbac.authorization.k8s.io/v1",
        "kind": "ClusterRoleBinding",
        "metadata": {"name": sa_name},
        "roleRef": {
            "apiGroup": "rbac.authorization.k8s.io",
            "kind": "ClusterRole",
            "name": "cluster-admin",
        },
        "subjects": [
            {"kind": "ServiceAccount", "name": sa_name, "namespace": sa_namespace}
        ],
    }

    sa_k8s_client.create(body=sa_manifest, namespace=sa_namespace)
    crb_k8s_client.create(body=crb_manifest)

    def _check_crb_exists():
        try:
            crb_k8s_client.get(name=sa_name)
        except kubernetes.client.rest.ApiException as err:
            if err.status == 404:
                raise AssertionError("ClusterRoleBinding not yet created")
            raise

    def _check_sa_exists():
        try:
            sa_obj = sa_k8s_client.get(name=sa_name, namespace=sa_namespace)
        except kubernetes.client.rest.ApiException as err:
            if err.status == 404:
                raise AssertionError("ServiceAccount not yet created")
            raise

        assert sa_obj.secrets
        assert sa_obj.secrets[0].name

        try:
            secret_obj = k8s_client.resources.get(api_version="v1", kind="Secret").get(
                sa_obj.secrets[0].name, sa_namespace
            )
        except kubernetes.client.rest.ApiException as err:
            if err.status == 404:
                raise AssertionError("Secret not yet created")
            raise

        assert secret_obj.data.get("token")

    # Wait for ClusterRoleBinding to exists
    utils.retry(_check_crb_exists, times=20, wait=3)

    # Wait for ServiceAccount to exists
    utils.retry(_check_sa_exists, times=20, wait=3)

    yield (sa_name, sa_namespace)

    try:
        crb_k8s_client.delete(
            name=sa_name,
            body=kubernetes.client.V1DeleteOptions(propagation_policy="Foreground"),
        )
    except kubernetes.client.rest.ApiException:
        pass

    sa_k8s_client.delete(
        name=sa_name,
        namespace=sa_namespace,
        body=kubernetes.client.V1DeleteOptions(propagation_policy="Foreground"),
    )


@pytest.fixture(scope="module")
def bootstrap_config(host):
    with host.sudo():
        config_file = host.file("/etc/metalk8s/bootstrap.yaml")
        if not config_file.exists:
            pytest.skip("Must be run on bootstrap node")
        return yaml.safe_load(config_file.content_string)


@pytest.fixture
def registry_address(host, version):
    with host.sudo():
        registry_json = host.check_output(
            "salt-call --out json slsutil.renderer string='"
            '{% from "metalk8s/map.jinja" import repo with context %}'
            "{{ repo.registry_endpoint }}' "
            "saltenv='metalk8s-" + str(version) + "'"
        )
    return json.loads(registry_json)["local"]


@pytest.fixture
def utils_image(registry_address, version):
    return "{registry_address}/{repository}/{image}".format(
        registry_address=registry_address,
        repository="metalk8s-{}".format(version),
        image="metalk8s-utils:{}".format(version),
    )


@pytest.fixture
def utils_manifest(utils_image):
    manifest_file = pathlib.Path(__file__).parent.resolve() / "files" / "utils.yaml"

    with open(manifest_file, encoding="utf-8") as fd:
        manifest = yaml.safe_load(fd)

    manifest["spec"]["containers"][0]["image"] = utils_image

    return manifest


@pytest.fixture
def utils_pod(k8s_client, utils_manifest):
    # Create the Pod
    pod_name = utils_manifest["metadata"]["name"]

    pod_k8s_client = k8s_client.resources.get(api_version="v1", kind="Pod")

    pod_k8s_client.create(body=utils_manifest, namespace="default")

    # Wait for the Pod to be ready
    utils.retry(
        kube_utils.check_pod_status(
            k8s_client, name=pod_name, namespace="default", state="Running"
        ),
        times=10,
        wait=12,
        name="wait for Pod '{}'".format(pod_name),
    )

    yield pod_name

    # Clean-up resources
    pod_k8s_client.delete(
        name=pod_name,
        namespace="default",
        body=kubernetes.client.V1DeleteOptions(
            grace_period_seconds=0,  # Force deletion instantly
        ),
    )


@pytest.fixture
def ssh_config(request):
    return request.config.getoption("--ssh-config")


@pytest.fixture
def prometheus_api(control_plane_ingress_ep):
    return utils.PrometheusApi(endpoint=f"{control_plane_ingress_ep}/api/prometheus")


@pytest.fixture
def grafana_api(control_plane_ingress_ep):
    return utils.GrafanaAPI(endpoint=f"{control_plane_ingress_ep}/grafana")


def count_running_pods(request, k8s_client, pods_count, label, namespace, node):
    ssh_config = request.config.getoption("--ssh-config")

    def _check_pods_count():
        pods = kube_utils.get_pods(
            k8s_client,
            ssh_config,
            label,
            node,
            namespace=namespace,
            state="Running",
        )
        assert len(pods) == pods_count

    error_msg = (
        "There is not exactly '{count}' pod(s) labeled '{label}' running "
        "in namespace '{namespace}'".format(
            count=pods_count, label=label, namespace=namespace
        )
    )
    if node:
        error_msg += "on node '{node}'".format(node=node)

    utils.retry(_check_pods_count, times=40, wait=3, error_msg=error_msg)


_COUNT_RUNNING_PODS_PARSER = parsers.re(
    r"we have (?P<pods_count>\d+) running pod labeled '(?P<label>[^']+)' "
    r"in namespace '(?P<namespace>[^']+)'(?: on node '(?P<node>[^']+)')?"
)


# }}}
# Given {{{


@given("the Kubernetes API is available")
def check_service(host):
    _verify_kubeapi_service(host)


@given(_COUNT_RUNNING_PODS_PARSER, converters=dict(pods_count=int))
def given_count_running_pods(request, k8s_client, pods_count, label, namespace, node):
    return count_running_pods(request, k8s_client, pods_count, label, namespace, node)


# }}}
# When {{{


@when(
    parsers.parse(
        "we wait for the rollout of '{resource}' in namespace '{namespace}' to complete"
    )
)
def wait_rollout_status(host, resource, namespace):
    # NOTE: we set a default timeout of 5 minutes, because anything higher would be
    # symptomatic of a really bad situation (the default being to never timeout, this
    # could cause issues in CI).
    with host.sudo():
        result = host.run(
            "kubectl --kubeconfig=/etc/kubernetes/admin.conf "
            "rollout status %s --namespace %s --timeout 5m",
            resource,
            namespace,
        )

    assert result.succeeded, (
        f"Rollout of '{resource}' in namespace '{namespace}' failed [{result.rc}]:\n"
        f"    stdout: {result.stdout}\n    stderr: {result.stderr}"
    )


# }}}
# Then {{{


@then("the Kubernetes API is available")
def verify_kubeapi_service(host):
    _verify_kubeapi_service(host)


@then(_COUNT_RUNNING_PODS_PARSER, converters=dict(pods_count=int))
def then_count_running_pods(request, k8s_client, pods_count, label, namespace, node):
    return count_running_pods(request, k8s_client, pods_count, label, namespace, node)


@then(
    parsers.parse(
        "the '{resource}' list should not be " "empty in the '{namespace}' namespace"
    )
)
def check_resource_list(host, resource, namespace):
    with host.sudo():
        output = host.check_output(
            "kubectl --kubeconfig=/etc/kubernetes/admin.conf "
            "get %s --namespace %s -o custom-columns=:metadata.name",
            resource,
            namespace,
        )

    assert len(output.strip()) > 0, "No {0} found in namespace {1}".format(
        resource, namespace
    )


@then(
    parsers.re(
        r"^we are (?P<should_fail>(?:not )?)able to login to Dex "
        r"as '(?P<username>[^']+)' using password '(?P<password>[^']+)'$"
    ),
    converters=dict(should_fail=lambda s: s == "not "),
)
def dex_login(username, password, should_fail, control_plane_ingress_ep):
    session = utils.requests_retry_session(
        # Both Dex and the ingress controller may fail with one of the following codes
        status_forcelist=(500, 502, 503, 504),
        retries=10,
        backoff_factor=2,
    )
    get_auth_start = time.time()
    try:
        auth_page = session.get(
            control_plane_ingress_ep + "/oidc/auth/local?",
            params={
                "response_type": "id_token",
                "client_id": "metalk8s-ui",
                "scope": "openid audience:server:client_id:oidc-auth-client",
                "redirect_uri": control_plane_ingress_ep + "/",
                "nonce": "nonce",
            },
            verify=False,
        )
    except requests.exceptions.ConnectionError as exc:
        pytest.fail("Failed to retrieve Dex authentication page: {}".format(exc))

    get_auth_duration = time.time() - get_auth_start
    if auth_page.status_code != 200:
        pytest.fail(
            f"Failed to retrieve Dex authentication page after {get_auth_duration:.1f} "
            f"seconds [status={auth_page.status_code}]:\n{auth_page.text}"
        )

    # The response is an HTML form (for display in a browser)
    auth_form = auth_page.text

    # The form action looks like:
    # <form method="post" action="/oidc/auth/local/login?back=&amp;state=ABCD">
    next_path_match = re.search(r'action=[\'"](?P<next_path>/oidc/\S+)[\'"]', auth_form)
    assert (
        next_path_match is not None
    ), "Could not find an anchor with `action='/oidc/...'` in Dex response:\n{}".format(
        auth_form
    )
    # NOTE: recent versions of Go HTTP lib do not allow semicolons in URLs, so
    # we manually replace the URL-encoded "&amp;" with a plain ampersand
    next_path = next_path_match.group("next_path").replace("&amp;", "&")

    try:
        auth_response = session.post(
            control_plane_ingress_ep + next_path,
            data={"login": username, "password": password},
            verify=False,
            allow_redirects=False,
        )
    except requests.exceptions.ConnectionError as exc:
        pytest.fail(
            "Failed when authenticating to Dex through '{}': {}".format(
                control_plane_ingress_ep + next_path, exc
            )
        )

    assert auth_response.text is not None
    if should_fail:
        assert auth_response.status_code == 200
        assert "Invalid Email Address and password" in auth_response.text
        assert auth_response.headers.get("location") is None
    else:
        assert auth_response.status_code == 303
        assert auth_response.headers.get("location") is not None


@then(parsers.parse('node "{node_name}" is a member of etcd cluster'))
def check_etcd_role(ssh_config, k8s_client, node_name):
    """Check if the given node is a member of the etcd cluster."""
    etcd_member_list = etcdctl(k8s_client, ["member", "list"], ssh_config)
    assert (
        node_name in etcd_member_list
    ), "node {} is not part of the etcd cluster".format(node_name)


# }}}
# Helpers {{{


def _verify_kubeapi_service(host):
    """Verify that the kubeapi service answer"""
    with host.sudo():
        cmd = "kubectl --kubeconfig=/etc/kubernetes/admin.conf cluster-info"
        res = host.run(cmd)
        if res.rc != 0:
            pytest.fail(res.stderr)


def etcdctl(k8s_client, command, ssh_config):
    """Run an etcdctl command inside the etcd container."""
    # NOTE: We use Kubernetes client instead of DynamicClient as it
    # ease the execution of command in a Pod
    client = kubernetes.client.CoreV1Api(api_client=k8s_client.client)

    name = "etcd-{}".format(utils.get_node_name("bootstrap", ssh_config))

    etcd_command = [
        "etcdctl",
        "--endpoints",
        "https://localhost:2379",
        "--cacert",
        "/etc/kubernetes/pki/etcd/ca.crt",
        "--key",
        "/etc/kubernetes/pki/etcd/server.key",
        "--cert",
        "/etc/kubernetes/pki/etcd/server.crt",
    ] + command
    output = kubernetes.stream.stream(
        client.connect_get_namespaced_pod_exec,
        name=name,
        namespace="kube-system",
        command=etcd_command,
        stderr=True,
        stdin=False,
        stdout=True,
        tty=False,
    )
    return output


# }}}
