# coding: utf-8


"""Tasks to manage vagrant.

This module provides a task that spawns an environment, using
Vagrant, with the ISO content mounted, and a task generation a
SSH key pair to be used during control plane expansion in this
environment.
"""


import shlex

import doit  # type: ignore

from buildchain import config
from buildchain import constants
from buildchain import types
from buildchain import utils

def task__vagrantkey() -> types.TaskDict:
    """Generate a SSH key pair in the .vagrant folder."""
    def mkdir_dot_vagrant() -> None:
        constants.VAGRANT_ROOT.mkdir(exist_ok=True)

    keygen = [
        'ssh-keygen',
        '-t', 'rsa',
        '-b', '4096',
        '-N', '',
        '-f', str(constants.VAGRANT_SSH_KEY_PAIR),
        '-C', 'doit'
    ]

    return {
        'actions': [mkdir_dot_vagrant, keygen],
        'targets': [constants.VAGRANT_SSH_KEY_PAIR],
        'uptodate': [True],
    }

def task__vagrant_up_noprov() -> types.TaskDict:
    """Run `vagrant up` without provisioning a development environment."""
    cmd = [config.VAGRANT, 'up']
    cmd.extend(map(shlex.quote, config.VAGRANT_UP_ARGS))
    cmd.append('--no-provision')

    return {
        'actions': [doit.tools.LongRunning(' '.join(cmd))],
        'file_dep': [],
        'task_dep': [],
        'uptodate': [False],
    }

def task__vagrant_snapshot() -> types.TaskDict:
    """Snapshot development environment."""
    vagranthalt = [config.VAGRANT, 'halt', 'bootstrap']
    vagrantsnap = [config.VAGRANT, 'snapshot', 'save', '--force', 'bootstrap',
        config.VAGRANT_SNAPSHOT_NAME]

    return {
        'actions': [vagranthalt, vagrantsnap],
        'task_dep': ['_vagrant_up_noprov'],
        'uptodate': [doit.tools.run_once],
        'verbosity': 2
    }

def task_vagrant_restore() -> types.TaskDict:
    """Restore development environment snapshot."""
    cmd = [config.VAGRANT, 'snapshot', 'restore', 'bootstrap',
        config.VAGRANT_SNAPSHOT_NAME]

    return {
        'actions': [cmd],
        'uptodate': [False],
        'verbosity': 2
    }

def task_vagrant_up() -> types.TaskDict:
    """Run `vagrant up` to (re-)provision a development environment."""
    vagrantup = [config.VAGRANT, 'up']
    vagrantup.extend(map(shlex.quote, config.VAGRANT_UP_ARGS))

    vagrantdestroy = [config.VAGRANT, 'destroy', '--force']

    return {
        'actions': [doit.tools.LongRunning(' '.join(vagrantup))],
        'file_dep': [constants.VAGRANT_SSH_KEY_PAIR],
        'task_dep': ['populate_iso', '_vagrant_snapshot'],
        'uptodate': [False],
        'clean': [vagrantdestroy],
        'verbosity': 2
    }

__all__ = utils.export_only_tasks(__name__)
