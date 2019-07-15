# coding: utf-8


"""Tasks for the linting.

This module runs the linting tools for several languages.

It provides a top level task to run all the linting tools, and each linting tool
is run in its own sub-task (so that you can run a single one and/or run several
linting tools in parallel).

Overview:
                ┌──────────────┐
           ╱───>│ lint:python  │
          ╱     └──────────────┘
         ╱      ┌──────────────┐
        ╱   ───>│ lint:yaml    │
┌────────┐╱     └──────────────┘
│  lint  │
└────────┘╲     ┌──────────────┐
        ╲   ───>│ lint:shell   │
         ╲      └──────────────┘
          ╲     ┌──────────────┐
           ╲───>│ lint:go      │
                └──────────────┘
"""


import os
import shlex
from pathlib import Path
import subprocess
from typing import Callable, Iterator, List, Optional, Tuple

import doit  # type: ignore

from buildchain import config
from buildchain import constants
from buildchain import types
from buildchain import utils


def task_lint() -> Iterator[types.TaskDict]:
    """Run the linting tools."""
    for create_lint_task in LINTERS:
        yield create_lint_task()


def lint_python() -> types.TaskDict:
    """Run Python linting."""
    buildchain = constants.ROOT/'buildchain'
    python_sources : List[Path] = [
        buildchain/'dodo.py',
        *buildchain.glob('buildchain/*.py'),
        *buildchain.glob('buildchain/targets/*.py'),
    ]
    cmd = ' '.join(map(shlex.quote, ['tox', '-e', 'lint-python']))
    env = {'PATH': os.environ['PATH'], 'OSTYPE': os.uname().sysname}
    return {
        'name': 'python',
        'doc': lint_python.__doc__,
        'actions': [doit.action.CmdAction(cmd, env=env)],
        'file_dep': python_sources,
    }


def lint_shell() -> types.TaskDict:
    """Run shell scripts linting."""
    shell_scripts : List[Path] = [constants.ROOT/'doit.sh']
    for ext in ('.sh', '.sh.in'):
        shell_scripts.extend(constants.ROOT.glob('*/*{}'.format(ext)))
    return {
        'name': 'shell',
        'doc': lint_shell.__doc__,
        'actions': [['tox', '-e', 'lint-shell']],
        'file_dep': shell_scripts,
    }


def lint_yaml() -> types.TaskDict:
    """Run YAML linting."""
    return {
        'name': 'yaml',
        'doc': lint_yaml.__doc__,
        'actions': [['tox', '-e', 'lint-yaml']],
        'file_dep': list(constants.ROOT.glob('salt/**/*.yaml')),
    }

def lint_go() -> types.TaskDict:
    """Run Go linting."""
    # Only keep directories (except `vendor`) and top-level Go source files.
    targets = [
        path.name for path in constants.STORAGE_OPERATOR_ROOT.glob('*')
        if (path.is_dir() and path.name != 'vendor') or path.suffix == '.go'
    ]

    def check_go_fmt() -> Optional[doit.exceptions.TaskError]:
        cwd  = constants.STORAGE_OPERATOR_ROOT
        cmd  = [config.ExtCommand.GOFMT.value, '-s', '-d', *targets]
        diff = subprocess.check_output(cmd, cwd=cwd)
        if diff:
            return doit.exceptions.TaskError(
                msg='badly formatted Go code, please run `doit.sh format:go`'
            )
        return None

    return {
        'name': 'go',
        'doc': lint_go.__doc__,
        'actions': [check_go_fmt],
        'task_dep': ['check_for:gofmt'],
        'file_dep': list(constants.STORAGE_OPERATOR_SOURCES),
    }


# List of available linter task.
LINTERS : Tuple[Callable[[], types.TaskDict], ...] = (
    lint_python,
    lint_shell,
    lint_yaml,
    lint_go,
)


__all__ = utils.export_only_tasks(__name__)
