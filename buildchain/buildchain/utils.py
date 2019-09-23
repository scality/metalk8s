# coding: utf-8


"""Miscellaneous helpers."""


import inspect
import subprocess
import sys
from pathlib import Path
from typing import Iterator, List, Optional

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


def git_ls(directory: Optional[str]=None) -> Iterator[Path]:
    """Return the list of files tracked by Git under `root` (recursively).

    Arguments:
        directory: directory to list (relative to the root of the repo).

    Returns:
        A list of files tracked by Git.
    """
    root = constants.ROOT if directory is None else constants.ROOT/directory
    assert root.is_dir()
    return map(Path, subprocess.check_output(
        ['git', 'ls-files', '-z', root], encoding='utf-8'
    ).split('\x00')[:-1])  # `:-1` to skip the last element (empty string).
