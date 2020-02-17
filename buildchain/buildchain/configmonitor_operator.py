# coding: utf-8

"""Tasks to build the MetalK8s ConfigMonitor Oeprator.

"""


from pathlib import Path

from buildchain import builder
from buildchain import config
from buildchain import constants
from buildchain import coreutils
from buildchain import docker_command
from buildchain import targets
from buildchain import types
from buildchain import utils


def task_ui() -> types.TaskDict:
    """Build the MetalK8s ConfigMonitor Operator."""
    return {
        'actions': None,
        'task_dep': [
            '_operator_bin',
            '_run_bin',
        ],
    }


def task__operator_bin() -> types.TaskDict:
    """Copy MetalK8s ConfigMonitor Operator binary to the build directory."""
    source = constants.ROOT/'images'/'configmonitor-operator'/'bin'/'main.py'
    target = config.BUILD_ROOT/'main.py'

    return {
        'title': utils.title_with_target1('COPY'),
        'actions': [(coreutils.cp_file, (source, target))],
        'targets': [target],
        'task_dep': ['_build_root'],
        'file_dep': [source],
        'clean': True,
    }


def task__run_bin() -> types.TaskDict:
    """Copy ConfigMonitor Operator script to the build directory."""
    source = constants.ROOT/'images'/'configmonitor-operator'/'bin'/'run.sh'
    target = config.BUILD_ROOT/'run.sh'

    return {
        'title': utils.title_with_target1('COPY'),
        'actions': [(coreutils.cp_file, (source, target))],
        'targets': [target],
        'task_dep': ['_build_root'],
        'file_dep': [source],
        'clean': True,
    }


__all__ = utils.export_only_tasks(__name__)
