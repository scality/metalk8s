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
    cwd = constants.STORAGE_OPERATOR_ROOT
    cmd = " ".join(
        map(
            shlex.quote,
            [
                config.ExtCommand.GOFMT.value,
                "-s",
                "-w",
                *tuple(constants.STORAGE_OPERATOR_FMT_ARGS),
            ],
        )
    )

    return {
        "name": "go",
        "title": utils.title_with_subtask_name("FORMAT"),
        "doc": format_go.__doc__,
        "actions": [doit.action.CmdAction(cmd, cwd=constants.ROOT).execute],
        "task_dep": ["check_for:gofmt"],
        "file_dep": list(constants.STORAGE_OPERATOR_SOURCES),
    }


def format_python() -> types.TaskDict:
    """Format Python code using black."""
    python_files = [
        filepath for filepath in utils.git_ls() if ".py" in filepath.suffixes
    ]
    return {
        "name": "python",
        "title": utils.title_with_subtask_name("FORMAT"),
        "doc": format_python.__doc__,
        "actions": [["tox", "-e", "lint", "black"]],
        "file_dep": python_files,
    }


# List of available formatting tasks.
FORMATTERS: Tuple[Callable[[], types.TaskDict], ...] = (format_go, format_python)


__all__ = utils.export_only_tasks(__name__)
