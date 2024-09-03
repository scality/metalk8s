import pytest
from pytest_bdd import given, when, then, scenario, parsers

from tests import kube_utils

# Fixture {{{


@pytest.fixture(scope="function")
def context():
    return {}


@pytest.fixture
def teardown(cert_client, secret_client, clusterissuer_client):
    yield
    cert_client.delete_all(sync=True, prefix="test-")
    secret_client.delete_all(sync=True, prefix="test-")
    clusterissuer_client.delete_all(sync=True, prefix="test-")


# }}}
# Scenarios {{{


@scenario("../features/cert_manager.feature", "Create a self-signed ClusterIssuer")
def test_create_self_signed_issuer(host, teardown):
    pass


@scenario("../features/cert_manager.feature", "Create a Certificate Authority")
def test_create_certificate_authority(host, teardown):
    pass


# }}}
# Given {{{


@given(parsers.parse("a '{name}' self-signed ClusterIssuer exists"))
def ss_clusterissuer_exists(name, clusterissuer_client):
    if clusterissuer_client.get(name) is None:
        clusterissuer_client.create_from_yaml(
            kube_utils.DEFAULT_SS_CLUSTERISSUER.format(name=name)
        )
        clusterissuer_client.wait_for_status(name, "Available")


# }}}
# When {{{


@when(parsers.parse("we create the following ClusterIssuer:\n{body}"))
def create_clusterissuer(body, clusterissuer_client):
    clusterissuer_client.create_from_yaml(body)


@when(parsers.parse("we create the following Certificate:\n{body}"))
def create_certificate(body, cert_client):
    cert_client.create_from_yaml(body)


# }}}
# Then {{{


@then(parsers.parse("the '{name}' ClusterIssuer is '{status}'"))
def check_clusterissuer_status(name, status, clusterissuer_client):
    clusterissuer_client.wait_for_status(name, status)


@then(parsers.parse("the '{name}' Certificate is '{status}'"))
def check_certificate_status(name, status, cert_client):
    cert_client.wait_for_status(name, status)


@then(parsers.parse("the '{name}' Certificate Secret has the correct fields"))
def check_cert_secret_fields(name, secret_client):
    secret = secret_client.get(name)
    assert secret is not None, "secret {} not found".format(name)
    for field in ["ca.crt", "tls.crt", "tls.key"]:
        assert field in secret["data"].keys(), "missing {} field in secret data".format(
            field
        )


# }}}
# Helpers
# }}}
