# -*- coding: utf-8 -*-
from configparser import ConfigParser
from itertools import chain

import pytest
from pytest_bdd import(
    given,
    then,
    when,
)


# Pytest fixtures
@pytest.fixture(scope="session")
def version():
    """Fixture that read metalk8s version.

    Version is extracted from _build/root/product.txt
    """
    version_file = "_build/root/product.txt"
    parser = ConfigParser()

    with open(version_file) as stream:
        # add a section header for configparser
        stream = chain(("[top]",), stream)
        parser.read_file(stream)

    return dict(parser.items('top'))


def _verify_kubeapi_service(host):
    """Verify that the kubeapi service answer"""
    with host.sudo():
        cmd = "kubectl --kubeconfig=/etc/kubernetes/admin.conf cluster-info"
        retcode = host.run(cmd).rc
        assert retcode == 0


def _run_bootstrap(host, version):
    cmd = "/srv/scality/metalk8s-{0}/bootstrap.sh".format(
        version['short_version']
    )
    with host.sudo():
        res = host.run(cmd)
        assert res.rc == 0, res.stdout


# Pytest-bdd steps

# Given
@given('bootstrap was run once')
def run_bootstrap(host, version):
    _run_bootstrap(host, version)


@given("the Kubernetes API is available")
def check_service(host):
    _verify_kubeapi_service(host)


# When
@when('we run bootstrap a second time')
def rerun_bootstrap(host, version):
    _run_bootstrap(host, version)


# Then
@then("the Kubernetes API is available")
def verify_kubeapi_service(host):
    _verify_kubeapi_service(host)
