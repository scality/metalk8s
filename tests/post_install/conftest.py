import pytest
import requests

from pytest_bdd import given
from pytest_bdd import when

from utils.helper import Inventory


@pytest.fixture(scope="session")
def inventory_obj(inventory):
    return Inventory(filename=inventory)


@pytest.fixture(scope="session")
def kubectl_proxy(request, run_services, watcher_getter, kubeconfig):
    def api_checker():
        try:
            response = requests.get('http://127.0.0.1:8001/')
        except requests.exceptions.RequestException:
            return False
        return bool(response)

    if run_services:
        kubectl_proxy = watcher_getter(
            name='make',
            arguments=['shell', 'C=kubectl proxy'],
            kwargs={'env': {'KUBECONFIG': kubeconfig}},
            request=request,
            checker=api_checker
        )
        return kubectl_proxy


@when("I run 'kubectl proxy' in a supported shell")
def run_kubectl_proxy(kubectl_proxy):
    pass


@given('A complete installation')
def complete_installation(inventory):
    pass
