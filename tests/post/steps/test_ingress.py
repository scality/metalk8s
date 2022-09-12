import json
import os
import re
import requests
import requests.exceptions
import time

import pytest
from pytest_bdd import given, parsers, scenario, then, when
import testinfra

from tests import utils


@scenario("../features/ingress.feature", "Access HTTP services")
def test_access_http_services(host):
    pass


@scenario("../features/ingress.feature", "Access HTTPS services")
def test_access_https_services(host):
    pass


@scenario("../features/ingress.feature", "Create new Ingress object (without class)")
def test_create_ingress_object_no_class(host, teardown):
    pass


@scenario("../features/ingress.feature", "Create new Ingress object (nginx class)")
def test_create_ingress_object_nginx_class(host, teardown):
    pass


@scenario("../features/ingress.feature", "Create new Ingress object (invalid class)")
def test_create_ingress_object_invalid_class(host, teardown):
    pass


@scenario("../features/ingress.feature", "Access HTTP services on control-plane IP")
def test_access_http_services_on_control_plane_ip(host):
    pass


@scenario(
    "../features/ingress.feature", "Expose Workload Plane Ingress on Control Plane"
)
def test_expose_wp_ingress_on_control_plane_ip(host, teardown):
    pass


@scenario("../features/ingress.feature", "Expose Workload Plane Ingress on some VIPs")
def test_expose_wp_ingress_on_vips(host, teardown):
    pass


@scenario("../features/ingress.feature", "Workload Plane Ingress VIPs reconfiguration")
def test_wp_ingress_vips_reconfig(host, teardown):
    pass


@scenario("../features/ingress.feature", "Workload Plane Ingress VIPs multiple pools")
def test_wp_ingress_vips_multi_pool(host, teardown):
    pass


@scenario("../features/ingress.feature", "Failover of Workload Plane Ingress VIPs")
def test_failover_wp_ingress_vips(host, teardown):
    pass


@scenario(
    "../features/ingress.feature", "Failover of Control Plane Ingress VIP using MetalLB"
)
def test_failover_cp_ingress_vip(host, teardown):
    pass


@scenario("../features/ingress.feature", "Change Control Plane Ingress IP to node-1 IP")
def test_change_cp_ingress_ip(host, teardown):
    pass


@scenario("../features/ingress.feature", "Enable MetalLB")
def test_change_cp_ingress_mode(host, teardown):
    pass


@scenario(
    "../features/ingress.feature", "Control Plane Ingress Controller pods spreading"
)
def test_cp_ingress_controller_pod_spreading(host):
    pass


@pytest.fixture(scope="function")
def context():
    return {}


@pytest.fixture
def teardown(context, host, ssh_config, version, k8s_client):
    yield
    if "ingress_to_delete" in context:
        k8s_client.resources.get(
            api_version="networking.k8s.io/v1", kind="Ingress"
        ).delete(
            name=context["ingress_to_delete"]["name"],
            namespace=context["ingress_to_delete"]["namespace"],
        )

    if "node_to_uncordon" in context:
        k8s_client.resources.get(api_version="v1", kind="Node").patch(
            name=context["node_to_uncordon"], body={"spec": {"unschedulable": False}}
        )

    if "node_to_untaint" in context:
        with host.sudo():
            host.check_output(
                "kubectl --kubeconfig=/etc/kubernetes/admin.conf taint nodes "
                f"{context['node_to_untaint']} test-taint-no-ingress:NoSchedule-"
            )

    if "bootstrap_to_restore" in context:
        with host.sudo():
            host.check_output(
                "cp {} /etc/metalk8s/bootstrap.yaml".format(
                    context["bootstrap_to_restore"]
                )
            )

    if "cluster_config_to_restore" in context:
        cc_content = context["cluster_config_to_restore"].to_dict()
        client = k8s_client.resources.get(
            api_version="metalk8s.scality.com/v1alpha1", kind="ClusterConfig"
        )

        # We need to retrieve current ressourceVersion
        tmp_obj = client.get(name=cc_content["metadata"]["name"])
        cc_content["metadata"]["resourceVersion"] = tmp_obj.metadata.resourceVersion

        client.replace(body=cc_content)

    if context.get("reconfigure_cp_ingress"):
        re_configure_cp_ingress(host, version, ssh_config)

    if context.get("reconfigure_portmap"):
        re_configure_portmap(host, version, ssh_config)


@given("a VIP for Control Plane Ingress is available")
def we_have_a_vip(context):
    cp_ingress_vip = os.environ.get("CONTROL_PLANE_INGRESS_VIP")

    if not cp_ingress_vip:
        pytest.skip("No Control Plane Ingress VIP to switch to")

    context["new_cp_ingress_vip"] = cp_ingress_vip


@given("a list of VIPs for Workload Plane Ingress is available")
def we_have_a_vip_list(context):
    wp_ingress_vips = os.environ.get("WORKLOAD_PLANE_INGRESS_VIPS")

    if not wp_ingress_vips:
        pytest.skip("No Workload Plane Ingress list of VIPs to use")

    ips = wp_ingress_vips.split(",")

    # We set different variable that will be used in tests
    context["wp_ingress_vips"] = wp_ingress_vips

    context["wp_ingress_first_pool"] = ",".join(ips[:2])
    context["wp_ingress_second_pool"] = ",".join(ips[2:])


@given("MetalLB is already enabled")
def metallb_enabled(host):
    metallb_enabled = utils.get_pillar(host, "networks:control_plane:metalLB:enabled")

    if not metallb_enabled:
        pytest.skip("MetalLB is not enabled")


@given("MetalLB is disabled")
def disable_metallb(host, context, ssh_config, version):
    metallb_enabled = utils.get_pillar(host, "networks:control_plane:metalLB:enabled")

    if metallb_enabled:
        bootstrap_patch = {
            "networks": {"controlPlane": {"metalLB": {"enabled": False}, "ingress": {}}}
        }

        utils.patch_bootstrap_config(context, host, bootstrap_patch)
        re_configure_cp_ingress(host, version, ssh_config, context=context)


@given(
    parsers.parse(
        "'{ips}' Workload Plane VIPs are configured in the '{cc_name}' ClusterConfig '{pool_name}' pool"
    )
)
def wp_ingress_vip_setup(
    host, context, ssh_config, version, k8s_client, cc_name, pool_name, ips
):
    update_cc_pool(
        host, context, ssh_config, version, k8s_client, cc_name, pool_name, ips
    )
    wait_cc_status(k8s_client, cc_name, "Ready")
    rollout_restart(host, "daemonset/ingress-nginx-controller", "metalk8s-ingress")


_SPREAD_IPS_PARSER = parsers.parse("the '{ips}' IPs are spread on nodes")


@given(_SPREAD_IPS_PARSER)
def given_check_vips_spreading(host, ssh_config, context, ips):
    check_vips_spreading(host, ssh_config, context, ips)


@when(
    parsers.re(
        r"we perform an (?P<protocol>HTTPS?) request (?:on path '(?P<path>[^']+)' )?"
        r"on port (?P<port>\d+) on a (?P<plane>.*) IP"
    )
)
def perform_request(host, context, protocol, port, plane, path):
    grains = {
        "workload-plane": "metalk8s:workload_plane_ip",
        "control-plane": "metalk8s:control_plane_ip",
    }

    if plane not in grains:
        raise NotImplementedError

    ip = utils.get_grain(host, grains[plane])

    try:
        context["response"] = requests.get(
            "{proto}://{ip}:{port}/{path}".format(
                proto=protocol.lower(), ip=ip, port=port, path=path or ""
            ),
            verify=False,
        )
    except Exception as exc:
        context["exception"] = exc


@when(
    parsers.re(
        r"we create a '(?P<name>[^']+)' Ingress (?:with class '(?P<ingress_class>[^']+)' )?"
        r"on path '(?P<path>[^']+)' on '(?P<svc_name>[^']+)' service on '(?P<port_name>[^']+)' "
        r"in '(?P<namespace>[^']+)' namespace"
    )
)
def create_ingress(
    context, k8s_client, name, ingress_class, path, svc_name, port_name, namespace
):
    body = {
        "apiVersion": "networking.k8s.io/v1",
        "kind": "Ingress",
        "metadata": {
            "name": name,
            "namespace": namespace,
            "annotations": {"nginx.ingress.kubernetes.io/rewrite-target": "/"},
        },
        "spec": {
            "ingressClassName": ingress_class,
            "rules": [
                {
                    "http": {
                        "paths": [
                            {
                                "path": path,
                                "pathType": "Prefix",
                                "backend": {
                                    "service": {
                                        "name": svc_name,
                                        "port": {"name": port_name},
                                    }
                                },
                            }
                        ]
                    }
                }
            ],
        },
    }

    k8s_client.resources.get(api_version="networking.k8s.io/v1", kind="Ingress").create(
        body=body, namespace=namespace
    )
    context["ingress_to_delete"] = {"name": name, "namespace": namespace}

    # Wait a bit after Ingress creation
    time.sleep(5)


@when("we stop the node hosting the Control Plane Ingress VIP")
def stop_cp_ingress_vip_node(context, k8s_client):
    node_name = get_node_hosting_cp_ingress_vip(k8s_client)

    context["cp_ingress_vip_node"] = node_name
    context["node_to_uncordon"] = node_name

    # Cordon node
    k8s_client.resources.get(api_version="v1", kind="Node").patch(
        name=node_name, body={"spec": {"unschedulable": True}}
    )

    pod_k8s_client = k8s_client.resources.get(api_version="v1", kind="Pod")
    # Delete Control Plane Ingress Controller from node
    cp_ingress_pods = pod_k8s_client.get(
        namespace="metalk8s-ingress",
        label_selector="app.kubernetes.io/instance=ingress-nginx-control-plane",
        field_selector="spec.nodeName={}".format(node_name),
    )
    for pod in cp_ingress_pods.items:
        pod_k8s_client.delete(name=pod.metadata.name, namespace=pod.metadata.namespace)


@when(parsers.parse("we stop the node '{node_name}' Workload Plane Ingress"))
def stop_wp_ingress_node(host, context, k8s_client, node_name):
    context["node_to_untaint"] = node_name

    # Add a custom taint to ensure the Workload Plane Ingress pod do not
    # get reschedule
    with host.sudo():
        host.check_output(
            "kubectl --kubeconfig=/etc/kubernetes/admin.conf taint nodes "
            f"{node_name} test-taint-no-ingress:NoSchedule"
        )

    client = k8s_client.resources.get(api_version="v1", kind="Pod")
    # Delete the Workload Plane Ingress controller actually running on this node
    wp_ingress_pods = client.get(
        namespace="metalk8s-ingress",
        label_selector="app.kubernetes.io/instance=ingress-nginx",
        field_selector=f"spec.nodeName={node_name}",
    )
    for pod in wp_ingress_pods.items:
        client.delete(name=pod.metadata.name, namespace=pod.metadata.namespace)

    def _wait_for_deletion():
        assert not client.get(
            namespace="metalk8s-ingress",
            label_selector="app.kubernetes.io/instance=ingress-nginx",
            field_selector=f"spec.nodeName={node_name}",
        ).items

    utils.retry(
        _wait_for_deletion,
        times=24,
        wait=5,
        name=f"waiting for Workload Plane Ingress pods from '{node_name}' to be deleted",
    )


@when(parsers.parse("we set control plane ingress IP to node '{node_name}' IP"))
def update_cp_ingress_ip(host, context, ssh_config, version, node_name):
    node = testinfra.get_host(node_name, ssh_config=ssh_config)
    ip = utils.get_grain(node, "metalk8s:control_plane_ip")

    bootstrap_patch = {"networks": {"controlPlane": {"ingress": {"ip": ip}}}}

    utils.patch_bootstrap_config(context, host, bootstrap_patch)
    re_configure_cp_ingress(host, version, ssh_config, context=context)


@when(parsers.parse("we enable MetalLB and set control plane ingress IP to '{ip}'"))
def update_control_plane_ingress_ip(host, context, ssh_config, version, ip):
    ip = ip.format(**context)

    bootstrap_patch = {
        "networks": {
            "controlPlane": {"metalLB": {"enabled": True}, "ingress": {"ip": ip}}
        }
    }

    utils.patch_bootstrap_config(context, host, bootstrap_patch)
    re_configure_cp_ingress(host, version, ssh_config, context=context)


@when(parsers.parse("we set portmap CIDRs to {plane} CIDR"))
def update_portmap_cidr(host, context, ssh_config, version, plane):
    pillar = {
        "workload-plane": "networks:workload_plane:cidr",
        "control-plane": "networks:control_plane:cidr",
    }

    new_cidrs = utils.get_pillar(host, pillar[plane])

    bootstrap_patch = {"networks": {"portmap": {"cidr": new_cidrs}}}

    utils.patch_bootstrap_config(context, host, bootstrap_patch)
    re_configure_portmap(host, version, ssh_config, context=context)


@when(
    parsers.parse(
        "we trigger a rollout restart of '{resource}' in namespace '{namespace}'"
    )
)
def rollout_restart(host, resource, namespace):
    with host.sudo():
        result = host.run(
            "kubectl --kubeconfig=/etc/kubernetes/admin.conf "
            "rollout restart %s --namespace %s",
            resource,
            namespace,
        )


@when(
    parsers.parse(
        "we update the '{cc_name}' ClusterConfig to add '{pool_name}' Workload Plane pool with IPs '{ips}'"
    )
)
def update_cc_pool(
    host, context, ssh_config, version, k8s_client, cc_name, pool_name, ips
):
    ips = ips.format(**context).split(",")
    client = k8s_client.resources.get(
        api_version="metalk8s.scality.com/v1alpha1", kind="ClusterConfig"
    )

    if not context.get("cluster_config_to_restore"):
        context["cluster_config_to_restore"] = client.get(name=cc_name)

    # Patch the ClusterConfig object
    client.patch(
        name=cc_name,
        body={
            "spec": {
                "workloadPlane": {
                    "virtualIPPools": {
                        pool_name: {
                            "addresses": ips,
                            "tolerations": [
                                {
                                    "key": "node-role.kubernetes.io/bootstrap",
                                    "operator": "Equal",
                                    "effect": "NoSchedule",
                                },
                                {
                                    "key": "node-role.kubernetes.io/infra",
                                    "operator": "Equal",
                                    "effect": "NoSchedule",
                                },
                            ],
                        }
                    }
                }
            }
        },
        content_type="application/merge-patch+json",
    )

    # Reconfigure portmap so that those VIPs can be used to reach the Ingress
    # NOTE: It should be part of the operator in the future
    re_configure_portmap(host, version, ssh_config, context=context)


@when(parsers.parse("we wait for the '{cc_name}' ClusterConfig to be '{status}'"))
def wait_cc_status(k8s_client, cc_name, status):
    client = k8s_client.resources.get(
        api_version="metalk8s.scality.com/v1alpha1", kind="ClusterConfig"
    )

    def _wait_for_status():
        obj = client.get(name=cc_name)

        for cond in obj.status.conditions or []:
            if cond.type == status:
                assert obj.generation == cond.observed_generation
                assert cond.status == "True"
                return

        raise AssertionError(
            f"ClusterConfig '{cc_name}' has no condition '{status}' yet"
        )

    utils.retry(
        _wait_for_status,
        times=24,
        wait=5,
        name=f"waiting for ClusterConfig '{cc_name}' to be '{status}'",
    )


@then(
    parsers.re(r"the server returns (?P<status_code>\d+) '(?P<reason>.+)'"),
    converters=dict(status_code=int),
)
def server_returns(host, context, status_code, reason):
    response = context.get("response")
    assert response is not None
    assert response.status_code == int(status_code)
    assert response.reason == reason


@then("the server should not respond")
def server_does_not_respond(host, context):
    assert "exception" in context
    assert isinstance(context["exception"], requests.exceptions.ConnectionError)


@then(
    parsers.re(
        r"an (?P<protocol>HTTPS?) request (?:on path '(?P<path>[^']+)' )?"
        r"on port (?P<port>\d+) on a (?P<plane>.*) IP returns "
        r"(?P<status_code>\d+) '(?P<reason>.+)'"
    ),
    converters=dict(status_code=int),
)
def server_request_returns(
    host, context, protocol, port, plane, path, status_code, reason
):
    perform_request(
        host=host, context=context, protocol=protocol, port=port, plane=plane, path=path
    )
    server_returns(host=host, context=context, status_code=status_code, reason=reason)


@then(
    parsers.re(
        r"an (?P<protocol>HTTPS?) request (?:on path '(?P<path>[^']+)' )?"
        r"on port (?P<port>\d+) on a (?P<plane>.*) IP should not return"
    ),
)
def server_request_does_not_return(host, context, protocol, port, plane, path):
    perform_request(
        host=host, context=context, protocol=protocol, port=port, plane=plane, path=path
    )
    server_does_not_respond(host=host, context=context)


@then(
    parsers.re(
        r"an (?P<protocol>HTTPS?) request (?:on path '(?P<path>[^']+)' )?"
        r"on port (?P<port>\d+) on '(?P<ips>.*)' IPs returns "
        r"(?P<status_code>\d+) '(?P<reason>.+)'"
    ),
    converters=dict(status_code=int),
)
def server_request_returns_multiple_ips(
    context, protocol, port, ips, path, status_code, reason
):
    ips = ips.format(**context).split(",")

    assert ips, "Error IPs list cannot be empty"

    for ip in ips:
        endpoint = "{proto}://{ip}:{port}/{path}".format(
            proto=protocol.lower(), ip=ip, port=port, path=path or ""
        )
        try:
            response = requests.get(endpoint, verify=False)
        except Exception as exc:
            raise AssertionError(f"Unable to reach ingress on '{endpoint}': {exc}")

        assert response is not None
        assert response.status_code == status_code
        assert response.reason == reason


@then(
    parsers.re(
        r"an (?P<protocol>HTTPS?) request (?:on path '(?P<path>[^']+)' )?"
        r"on port (?P<port>\d+) on '(?P<ips>.*)' IPs should not return"
    ),
)
def server_request_not_returns_multiple_ips(context, protocol, port, ips, path):
    ips = ips.format(**context).split(",")

    assert ips, "Error IPs list cannot be empty"

    for ip in ips:
        endpoint = "{proto}://{ip}:{port}/{path}".format(
            proto=protocol.lower(), ip=ip, port=port, path=path or ""
        )
        try:
            response = requests.get(endpoint, verify=False)
        except requests.exceptions.ConnectionError as exc:
            return
        except Exception as exc:
            raise AssertionError(
                f"Error when trying to reach ingress on '{endpoint}': {exc}"
            )

        raise AssertionError(f"The server shouldn't answer but got '{response}'")


@then(_SPREAD_IPS_PARSER)
def then_check_vips_spreading(host, ssh_config, context, ips):
    check_vips_spreading(host, ssh_config, context, ips)


@then(parsers.parse("the '{ips}' IPs should no longer sit on the node '{node_name}'"))
def check_ip_not_on_node(ssh_config, context, ips, node_name):
    ips = ips.format(**context).split(",")
    node = testinfra.get_host(node_name, ssh_config=ssh_config)

    def _ip_not_on_node():
        with node.sudo():
            node_ips = json.loads(
                node.check_output("salt-call --local --out=json network.ip_addrs")
            )["local"]

        assert not (set(node_ips) & set(ips))

    utils.retry(
        _ip_not_on_node,
        times=12,
        wait=5,
        name=f"waiting for '{node_name}' to no longer host VIPs",
    )


@then(parsers.parse("the '{ips}' IPs are no longer available on nodes"))
def check_ip_not_available(host, ssh_config, context, ips):
    ips = ips.format(**context).split(",")

    node_ips = json.loads(
        utils.run_salt_command(
            host,
            ["salt", "--static", "--out=json", "'*'", "network.ip_addrs"],
            ssh_config,
        ).stdout
    )

    for current_ips in node_ips.values():
        assert not (set(ips) & set(current_ips))


@then("the node hosting the Control Plane Ingress VIP changed")
def check_node_hosting_vip_changed(context, k8s_client):
    def _check_node_hosting():
        new_node = get_node_hosting_cp_ingress_vip(k8s_client)
        assert new_node != context["cp_ingress_vip_node"]

    utils.retry(_check_node_hosting, times=10, wait=3)


@then(parsers.parse("the control plane ingress IP is equal to node '{node_name}' IP"))
def check_cp_ingress_node_ip(control_plane_ingress_ip, node_name, ssh_config):
    node = testinfra.get_host(node_name, ssh_config=ssh_config)
    ip = utils.get_grain(node, "metalk8s:control_plane_ip")

    assert control_plane_ingress_ip == ip


@then(parsers.parse("the control plane ingress IP is equal to '{ip}'"))
def check_cp_ingress_ip(context, control_plane_ingress_ip, ip):
    ip = ip.format(**context)
    assert control_plane_ingress_ip == ip


def get_node_hosting_cp_ingress_vip(k8s_client):
    # To get the node where sit the VIP we need to look at event on the Service
    field_selectors = [
        "reason=nodeAssigned",
        "involvedObject.kind=Service",
        "involvedObject.name=ingress-nginx-control-plane-controller",
    ]
    events = k8s_client.resources.get(api_version="v1", kind="Event").get(
        namespace="metalk8s-ingress",
        field_selector=",".join(field_selectors),
    )

    assert events.items, "Unable to get event for Control Plane Ingress Service"

    match = None
    for event in sorted(
        events.items, key=lambda event: event.lastTimestamp, reverse=True
    ):
        match = re.search(r'announcing from node "(?P<node>.+)"', event.message)
        if match is not None:
            break

    assert match, "Unable to get the node hosting the Control Plane Ingress VIP"

    return match.group("node")


def re_configure_cp_ingress(host, version, ssh_config, context=None):
    with host.sudo():
        host.check_output(
            "salt-call --retcode-passthrough state.sls "
            "metalk8s.kubernetes.apiserver saltenv=metalk8s-{}".format(version)
        )

    command = [
        "salt-run",
        "state.orchestrate",
        "metalk8s.orchestrate.update-control-plane-ingress-ip",
        "saltenv=metalk8s-{}".format(version),
    ]

    utils.run_salt_command(host, command, ssh_config)

    if context is not None:
        context["reconfigure_cp_ingress"] = True


def re_configure_portmap(host, version, ssh_config, context=None):
    command = [
        "salt-run",
        "state.sls",
        "metalk8s.kubernetes.cni.calico.deployed",
        f"saltenv=metalk8s-{version}",
    ]

    utils.run_salt_command(host, command, ssh_config)

    command = [
        "salt",
        "'*'",
        "state.sls",
        "metalk8s.addons.nginx-ingress.certs",
        f"saltenv=metalk8s-{version}",
    ]

    utils.run_salt_command(host, command, ssh_config)

    if context is not None:
        context["reconfigure_portmap"] = True


def check_vips_spreading(host, ssh_config, context, ips):
    ips = ips.format(**context).split(",")

    node_ips = json.loads(
        utils.run_salt_command(
            host,
            ["salt", "--static", "--out=json", "'*'", "network.ip_addrs"],
            ssh_config,
        ).stdout
    )
    node_vip_count = {name: 0 for name in node_ips}

    for ip in ips:
        node_vip_count[
            next(name for name, ip_list in node_ips.items() if ip in ip_list)
        ] += 1

    # The node is with less IPs should at most host 1 VIP less than the one with the most IPs
    # Otherwise the IPs are not properly spread
    assert min(node_vip_count.values()) + 1 >= max(node_vip_count.values())
