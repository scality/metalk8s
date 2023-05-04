import pytest
from pytest_bdd import scenario, given, then, parsers

from tests import utils

# Scenarios
@scenario("../features/dns_resolution.feature", "check DNS")
def test_dns(host):
    pass


@scenario("../features/dns_resolution.feature", "check DNS host forward")
def test_dns_host_forward(host, teardown):
    pass


@scenario("../features/dns_resolution.feature", "check DNS host forward disabled")
def test_dns_host_forward_disabled(host, teardown):
    pass


@scenario("../features/dns_resolution.feature", "DNS pods spreading")
def test_dns_spread(host):
    pass


@pytest.fixture(scope="function")
def context():
    return {}


@pytest.fixture
def teardown(context, host, ssh_config, version):
    yield
    if "bootstrap_to_restore" in context:
        with host.sudo():
            host.check_output(
                "cp {} /etc/metalk8s/bootstrap.yaml".format(
                    context["bootstrap_to_restore"]
                )
            )
    if context.get("reconfigure_coredns"):
        re_configure_coredns(host, version, ssh_config)


@given(
    parsers.parse("coreDNS host forward is {enable}"),
    converters=dict(enable=lambda s: s == "enabled"),
)
def host_forward(host, context, version, ssh_config, enable):
    if utils.get_pillar(host, "kubernetes:coreDNS:hostForward") is not enable:
        utils.patch_bootstrap_config(
            context, host, {"kubernetes": {"coreDNS": {"hostForward": enable}}}
        )
        re_configure_coredns(host, version, ssh_config, context)


@then(parsers.parse("the hostname '{hostname}' should be resolved"))
def resolve_hostname(utils_pod, host, hostname):
    result = exec_nslookup(utils_pod, host, hostname)

    assert result.rc == 0, f"Cannot resolve {hostname}: {result.stderr}"


@then(parsers.parse("the hostname '{hostname}' should not be resolved"))
def resolve_hostname_fail(utils_pod, host, hostname):
    result = exec_nslookup(utils_pod, host, hostname)

    assert result.rc == 1, f"Shouldn't be able to resolve {hostname}: {result.stdout}"
    assert "NXDOMAIN" in result.stdout


def exec_nslookup(utils_pod, host, hostname):
    def _resolve():
        with host.sudo():
            ret = host.run(
                "kubectl --kubeconfig=/etc/kubernetes/admin.conf exec %s -- nslookup %s",
                utils_pod,
                hostname,
            )

        assert ret.rc != 137
        return ret

    return utils.retry(_resolve, times=5, wait=5, name=f"nslookup on {hostname}")


def re_configure_coredns(host, version, ssh_config, context=None):
    command = [
        "salt-run",
        "state.sls",
        "metalk8s.kubernetes.coredns.deployed",
        f"saltenv=metalk8s-{version}",
    ]

    if context is not None:
        context["reconfigure_coredns"] = True

    utils.run_salt_command(host, command, ssh_config)
