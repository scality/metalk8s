# coding: utf-8


"""Tasks for code generation."""


import shlex
from typing import Callable, Iterator, Tuple

import doit  # type: ignore

from buildchain import constants
from buildchain import types
from buildchain import utils


def task_codegen() -> Iterator[types.TaskDict]:
    """Run the code generation tools."""
    for create_codegen_task in CODEGEN:
        yield create_codegen_task()


def codegen_go() -> types.TaskDict:
    """Generate Go code using the Operator SDK Makefile."""
    cwd = constants.STORAGE_OPERATOR_ROOT
    actions = []
    for cmd in constants.OPERATOR_SDK_GENERATE_CMDS:
        actions.append(doit.action.CmdAction(" ".join(map(shlex.quote, cmd)), cwd=cwd))

    return {
        "name": "go",
        "title": utils.title_with_subtask_name("CODEGEN"),
        "doc": codegen_go.__doc__,
        "actions": actions,
        "task_dep": ["check_for:make"],
        "file_dep": list(constants.STORAGE_OPERATOR_SOURCES),
    }


# List of available code generation tasks.
CODEGEN: Tuple[Callable[[], types.TaskDict], ...] = (codegen_go,)


__all__ = utils.export_only_tasks(__name__)
