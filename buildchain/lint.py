# coding: utf-8


"""Tasks for the linting.

This module runs the linting tools for several languages.

It provides a top level task to run all the linting tools, and each linting tool
is run in its own sub-task (so that you can run a single one and/or run several
linting tools in parallel).

Overview:

                ┌────────────┐
            ───>│ lint:yaml  │
┌────────┐╱     └────────────┘
│  lint  │
└────────┘╲     ┌────────────┐
            ───>│ lint:shell │
                └────────────┘
"""


from pathlib import Path
from typing import Callable, Iterator, List, Tuple

from buildchain import constants
from buildchain import types
from buildchain import utils


def task_lint() -> Iterator[types.TaskDict]:
    """Run the linting tools."""
    for create_lint_task in LINTERS:
        yield create_lint_task()


def lint_shell() -> types.TaskDict:
    """Run shell scripts linting."""
    shell_scripts : List[Path] = []
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


# List of available linter task.
LINTERS : Tuple[Callable[[], types.TaskDict], ...] = (
    lint_shell,
    lint_yaml,
)


__all__ = utils.export_only_tasks(__name__)
