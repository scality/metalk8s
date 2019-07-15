# coding: utf-8


"""Tasks for code auto-formatting."""


import shlex
from typing import Callable, Iterator, Tuple

import doit  # type: ignore

from buildchain import config
from buildchain import constants
from buildchain import types
from buildchain import utils


def task_format() -> Iterator[types.TaskDict]:
    """Run the code auto-formatting tools."""
    for create_format_task in FORMATTERS:
        yield create_format_task()


def format_go() -> types.TaskDict:
    """Format Go code using gofmt."""
    # Only keep directories (except `vendor`) and top-level Go source files.
    targets = [
        path.name for path in constants.STORAGE_OPERATOR_ROOT.glob('*')
        if (path.is_dir() and path.name != 'vendor') or path.suffix == '.go'
    ]
    cwd  = constants.STORAGE_OPERATOR_ROOT
    cmd = ' '.join(map(shlex.quote, [
        config.ExtCommand.GOFMT.value, '-s', '-w', *targets
    ]))

    return {
        'name': 'go',
        'title': format_task_title,
        'doc': format_go.__doc__,
        'actions': [doit.action.CmdAction(cmd, cwd=cwd)],
        'task_dep': ['check_for:gofmt'],
        'file_dep': list(constants.STORAGE_OPERATOR_SOURCES),
    }


def format_task_title(task: types.Task) -> str:
    """Display a nice title for format tasks."""
    # Since format tasks are sub-tasks, we extract the sub-task name (after `:`)
    return '{cmd: <{width}} {name}'.format(
        cmd='FORMAT', width=constants.CMD_WIDTH, name=task.name.split(':')[1]
    )


# List of available formatting tasks.
FORMATTERS: Tuple[Callable[[], types.TaskDict], ...] = (
    format_go,
)


__all__ = utils.export_only_tasks(__name__)
