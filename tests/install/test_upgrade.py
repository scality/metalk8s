import os

import pytest

from pytest_bdd import parsers
from pytest_bdd import scenario
from pytest_bdd import when

from utils.helper import create_version_archive
from utils.helper import run_ansible_playbook


@pytest.fixture
def pytestbdd_strict_gherkin():
    return False


@scenario('features/upgrade.feature', 'Upgrade from 1.0.0')
def test_upgrade(inventory_tagging):
    pass


@when(parsers.parse(
    "I launch ansible playbook '{playbook}' from version {version}"
))
def ansible_playbook_from_version(
        request, inventory, playbook, archive_dir, version):
    archive_version = create_version_archive(version, archive_dir)
    inventory_path = os.path.abspath(inventory)
    ansible_process = run_ansible_playbook(
        playbook,
        basedir=archive_version,
        env={'ANSIBLE_INVENTORY': inventory_path}
    )
    request.ansible_process = ansible_process
    return ansible_process
