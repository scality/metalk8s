
import os
import shutil

import pytest

from pytest_bdd import parsers
from pytest_bdd import when


# Small pytest plugin to re-order test.
# Inspired by https://pytest-ordering.readthedocs.io/,
# who is missing critical features and consist in ~50 lines of codes


def pytest_configure(config):
    """Register the "run" marker."""

    config_line = (
        'run: specify ordering information for when tests should run '
        'in relation to one another'
    )
    config.addinivalue_line('markers', config_line)


class Order(object):
    """Ordered object that follow [1, 2, 3, .., 0, .., -3, -2, -1]

    >>> Order(1) < Order(2)
    True
    >>> Order(1) < Order(0)
    True
    >>> Order(1) < Order(-2)
    True
    >>> Order(1) < Order(1)
    False
    >>> Order(1) <= Order(1)
    True
    >>> Order(0) < Order(-2)
    True
    >>> Order(0) <= Order(-2)
    True
    >>> Order(0) < Order(0)
    False
    >>> Order(0) <= Order(0)
    True
    """
    __slots__ = ['order']

    def __init__(self, order):
        self.order = order

    def __lt__(self, other):
        if self.order * other.order > 0:  # Detect same sign
            return self.order < other.order
        else:
            # Opposite sign or 0. Compute the opposite is
            # [-1, -2, -3, .., 0, .., 3, 2, 1]
            # Wich is ordered for opposite sign or null number.
            return -self.order < -other.order

    def __gt__(self, other):
        return other.__lt__(self)

    def __eq__(self, other):
        return self.order == other.order

    def __le__(self, other):
        if self.order * other.order > 0:  # Detect same sign
            return self.order <= other.order
        else:  # Same as trick as __lt__
            return -self.order <= -other.order

    def __ge__(self, other):
        return other.__le__(self)


def pytest_collection_modifyitems(session, config, items):

    def get_order(item):
        mark = item.get_marker('run')
        if mark:
            return Order(mark.kwargs.get('order', 0))
        else:
            return Order(0)

    items.sort(key=get_order)


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
