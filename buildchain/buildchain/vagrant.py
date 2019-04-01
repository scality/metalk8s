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

def task_vagrantup() -> types.TaskDict:
    """Run `vagrant up` to (re-)provision a development environment."""
    vagrant = [config.VAGRANT, 'up']
    vagrant.extend(map(shlex.quote, config.VAGRANT_UP_ARGS))
    return {
        'actions': [doit.tools.LongRunning(' '.join(vagrant))],
        'file_dep': [constants.VAGRANT_SSH_KEY_PAIR],
        'task_dep': ['populate_iso'],
        'uptodate': [False],
    }


__all__ = utils.export_only_tasks(__name__)
