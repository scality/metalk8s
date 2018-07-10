import functools
import logging
import os
import os.path

import pytest

from pytest_bdd import given
from pytest_bdd import parsers
from pytest_bdd import then
from pytest_bdd import when

from utils.helper import run_ansible_playbook



def pytest_addoption(parser):
    parser.addoption(
        '--inventory', help='Inventory where is specified servers for tests'
    )


@pytest.fixture
def pytestbdd_strict_gherkin():
   return False


@pytest.fixture(scope="session")
def inventory_sources(request):
    inventory_cli_arg = request.config.getoption('--inventory')
    inventory_env_var = os.environ.get('ANSIBLE_INVENTORY')
    inventory = inventory_cli_arg or inventory_env_var
    assert inventory, 'You should provide an inventory to run test'
    return inventory_cli_arg, inventory_env_var


@given('A complete inventory')
def inventory_cli_arg(inventory_sources):
    inventory_cli_arg, _ = inventory_sources
    return inventory_cli_arg


@pytest.fixture(scope="session")
def inventory(inventory_sources):
    inventory_cli_arg, inventory_env_var = inventory_sources
    return inventory_cli_arg or inventory_env_var


@pytest.fixture(scope="session")
def kubeconfig(inventory):
    inventory_dir = os.path.dirname(inventory)
    return '{}/artifacts/admin.conf'.format(inventory_dir)


@when(parsers.parse("I launch ansible with the '{playbook}' playbook"))
def ansible_playbook_step(request, inventory_cli_arg, playbook):
    ansible_process = run_ansible_playbook(playbook, inventory_cli_arg)
    request.ansible_process = ansible_process
    return ansible_process


@then('Playbook should complete without error')
def ansible_no_error(request):
    assert request.ansible_process.returncode == 0
