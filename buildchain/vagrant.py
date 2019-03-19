# coding: utf-8


"""Tasks to manage vagrant.

For now, this module provide a single task that spawn an environment, using
Vagrant, with the ISO content mounted.
"""


import shlex

import doit  # type: ignore

from buildchain import config
from buildchain import types
from buildchain import utils


def task_vagrantup() -> types.TaskDict:
    """Run `vagrant up` to (re-)provision a development environment."""
    vagrant = [config.VAGRANT, 'up']
    vagrant.extend(map(shlex.quote, config.VAGRANT_UP_OPTS))
    return {
        'actions': [doit.tools.LongRunning(' '.join(vagrant))],
        'task_dep': ['_iso_populate'],
        'uptodate': [False],
    }


__all__ = utils.export_only_tasks(__name__)
