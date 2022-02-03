import pytest
from pytest_bdd import scenario, then, parsers


# Scenarios
@scenario("../features/dns_resolution.feature", "check DNS")
def test_dns(host):
    pass


@scenario("../features/dns_resolution.feature", "DNS pods spreading")
def test_dns_spread(host):
    pass


@then(parsers.parse("the hostname '{hostname}' should be resolved"))
def resolve_hostname(utils_pod, host, hostname):
    with host.sudo():
        # test dns resolve
        result = host.run(
            "kubectl --kubeconfig=/etc/kubernetes/admin.conf " "exec %s nslookup %s",
            utils_pod,
            hostname,
        )
        if result.rc != 0:
            pytest.fail("Cannot resolve {}: {}".format(hostname, result.stderr))
