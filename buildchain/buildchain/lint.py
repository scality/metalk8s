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

# Python {{{

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
        'title': _title,
        'doc': lint_python.__doc__,
        'actions': [doit.action.CmdAction(cmd, env=env)],
        'file_dep': python_sources,
    }

# }}}
# Shell {{{

def lint_shell() -> types.TaskDict:
    """Run shell scripts linting."""
    shell_scripts : List[Path] = [constants.ROOT/'doit.sh']
    for ext in ('.sh', '.sh.in'):
        shell_scripts.extend(constants.ROOT.glob('*/*{}'.format(ext)))
    return {
        'name': 'shell',
        'title': _title,
        'doc': lint_shell.__doc__,
        'actions': [['tox', '-e', 'lint-shell']],
        'file_dep': shell_scripts,
    }

# }}}
# YAML {{{

def lint_yaml() -> types.TaskDict:
    """Run YAML linting."""
    return {
        'name': 'yaml',
        'title': _title,
        'doc': lint_yaml.__doc__,
        'actions': [['tox', '-e', 'lint-yaml']],
        'file_dep': list(constants.ROOT.glob('salt/**/*.yaml')),
    }

# }}}
# Go {{{

def check_go_fmt() -> Optional[doit.exceptions.TaskError]:
    """Check if Go code is properly formatted."""
    cwd  = constants.STORAGE_OPERATOR_ROOT
    cmd  = [
        config.ExtCommand.GOFMT.value, '-s', '-d',
        *tuple(constants.STORAGE_OPERATOR_FMT_ARGS)
    ]
    diff = subprocess.check_output(cmd, cwd=cwd)
    if diff:
        return doit.exceptions.TaskError(
            msg='badly formatted Go code, please run `doit.sh format:go`'
        )
    return None


def check_go_codegen() -> Optional[doit.exceptions.TaskError]:
    """Check if the generated files are up to date."""
    cwd  = constants.STORAGE_OPERATOR_ROOT
    git_diff = [config.ExtCommand.GIT.value, 'diff']
    base = subprocess.check_output(git_diff)
    for target in ('k8s', 'openapi'):
        cmd = [config.ExtCommand.OPERATOR_SDK.value, 'generate', target]
        subprocess.check_call(cmd, cwd=cwd)
    current = subprocess.check_output(git_diff)
    # If the diff changed after running the code generation that means that
    # the generated files are not in sync with the "source" files.
    if current != base:
        return doit.exceptions.TaskError(
            msg='outdated generated Go files, did you run `doit.sh codegen:go`?'
        )
    return None


def lint_go() -> types.TaskDict:
    """Run Go linting."""
    return {
        'name': 'go',
        'title': _title,
        'doc': lint_go.__doc__,
        'actions': [check_go_fmt, check_go_codegen],
        'task_dep': [
            'check_for:gofmt', 'check_for:operator-sdk', 'check_for:git'
        ],
        'file_dep': list(constants.STORAGE_OPERATOR_SOURCES),
    }

# }}}

def _title(task: types.Task) -> str:
    return utils.title_with_subtask_name('LINT', task)


# List of available linter task.
LINTERS : Tuple[Callable[[], types.TaskDict], ...] = (
    lint_python,
    lint_shell,
    lint_yaml,
    lint_go,
)


__all__ = utils.export_only_tasks(__name__)
