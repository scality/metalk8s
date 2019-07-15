# coding: utf-8


"""Miscellaneous helpers."""


import inspect
import sys
from pathlib import Path
from typing import List

from buildchain import config
from buildchain import constants
from buildchain import types


def export_only_tasks(module_name: str) -> List[str]:
    """Return the list of tasks defined in the specified module.

    Arguments:
        module_name: name of the module

    Returns:
        The name of all the task-creator defined in this module.
    """
    return [
        name
        for name, _
        in inspect.getmembers(sys.modules[module_name], inspect.isfunction)
        if name.startswith('task_')
    ]


def build_relpath(path: Path) -> Path:
    """Return the given path, but relative to the build root.

    Arguments:
        path: an absolute path inside the build directory

    Returns:
        The same path, but relative to the build directory.

    Examples:
        >>> build_relpath(Path('/home/foo/metalk8s/_build/metalk8s.iso'))
        PosixPath('_build/metalk8s.iso')
    """
    return path.relative_to(config.BUILD_ROOT.parent)


def title_with_target1(command: str, task: types.Task) -> str:
    """Return a title with the command prefixed with the first target.

    Arguments:
        command: name of the command
        task: a doit task

    Returns:
        A string describing the task, with the command name properly padded.
    """
    return '{cmd: <{width}} {path}'.format(
        cmd=command, width=constants.CMD_WIDTH,
        path=build_relpath(Path(task.targets[0])),
    )


def title_with_subtask_name(command: str, task: types.Task) -> str:
    """Return a title with the command suffixed with the sub-task name.

    Arguments:
        command: name of the command
        task: a doit task

    Returns:
        A string describing the task, with the command name properly padded.
    """
    # Extract the sub-task name (the part after `:`) from the task name.
    return '{cmd: <{width}} {name}'.format(
        cmd=command, width=constants.CMD_WIDTH, name=task.name.split(':')[1]
    )
