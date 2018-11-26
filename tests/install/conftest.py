
import os
import shutil

import pytest

from pytest_bdd import parsers
from pytest_bdd import when


@when(parsers.parse("I add '{file_}' to '{group}' group_vars"))
def add_to_group_vars(inventory, file_, group):
    base_dir = os.path.dirname(inventory)
    group_vars = os.path.join(base_dir, 'group_vars', group)
    try:
        os.makedirs(group_vars)
    except FileExistsError:
        pass
    shutil.copy(
        os.path.join('./tests/install/files', file_),
        os.path.join(group_vars, file_)
    )


@when(parsers.parse("I remove '{file_}' to '{group}' group_vars"))
def remove_to_group_vars(inventory, file_, group):
    base_dir = os.path.dirname(inventory)
    group_vars = os.path.join(base_dir, 'group_vars', group)
    os.remove(os.path.join(group_vars, file_))


@pytest.fixture(scope="session")
def archive_dir(tmpdir_factory):
    return tmpdir_factory.mktemp("archive")
