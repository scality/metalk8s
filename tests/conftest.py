import os
import os.path

import pytest

from pytest_bdd import given
from pytest_bdd import parsers
from pytest_bdd import then
from pytest_bdd import when

from utils.helper import run_ansible_playbook


@pytest.fixture(scope="session")
def inventory():
    inventory_file = os.environ.get('ANSIBLE_INVENTORY')
    if not os.path.exists(inventory_file):
        pytest.fail(
            "The path specified by ANSIBLE_INVENTORY environment variable "
            "does not exist: '{0}'".format(inventory_file)
        )
    return inventory_file


@pytest.fixture(scope="session")
def kubeconfig(inventory):
    inventory_dir = os.path.dirname(inventory)
    kubeconfig = os.environ.get(
        'KUBECONFIG',
        '{}/artifacts/admin.conf'.format(inventory_dir)
    )
    if not os.path.exists(kubeconfig):
        pytest.fail(
            "The path in KUBECONFIG environment variable "
            "does not exist: '{0}'".format(kubeconfig)
        )

    return kubeconfig


@given('A complete inventory')
def inventory_check(inventory):
    return inventory


@given('an installed platform')
def complete_installation(inventory):
    pass


@when(parsers.parse("I launch ansible with the '{playbook}' playbook"))
def ansible_playbook_step(request, inventory, playbook):
    ansible_process = run_ansible_playbook(playbook)
    request.ansible_process = ansible_process
    return ansible_process


@then('Playbook should complete without error')
def ansible_no_error(request):
    assert request.ansible_process.returncode == 0
