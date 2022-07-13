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


def codegen_metalk8s_operator() -> types.TaskDict:
    """Generate Go code for the MetalK8s Operator using the Operator SDK Makefile."""
    cwd = constants.METALK8S_OPERATOR_ROOT
    actions = []
    for cmd in constants.METALK8S_OPERATOR_SDK_GENERATE_CMDS:
        actions.append(doit.action.CmdAction(" ".join(map(shlex.quote, cmd)), cwd=cwd))

    return {
        "name": "metalk8s_operator",
        "title": utils.title_with_subtask_name("CODEGEN"),
        "doc": codegen_metalk8s_operator.__doc__,
        "actions": actions,
        "task_dep": ["check_for:make"],
        "file_dep": list(constants.METALK8S_OPERATOR_SOURCES),
    }


def codegen_storage_operator() -> types.TaskDict:
    """Generate Go code for the Storage Operator using the Operator SDK Makefile."""
    cwd = constants.STORAGE_OPERATOR_ROOT
    actions = []
    for cmd in constants.STORAGE_OPERATOR_SDK_GENERATE_CMDS:
        actions.append(doit.action.CmdAction(" ".join(map(shlex.quote, cmd)), cwd=cwd))

    return {
        "name": "storage_operator",
        "title": utils.title_with_subtask_name("CODEGEN"),
        "doc": codegen_storage_operator.__doc__,
        "actions": actions,
        "task_dep": ["check_for:make"],
        "file_dep": list(constants.STORAGE_OPERATOR_SOURCES),
    }


# List of available code generation tasks.
CODEGEN: Tuple[Callable[[], types.TaskDict], ...] = (
    codegen_storage_operator,
    codegen_metalk8s_operator,
)


__all__ = utils.export_only_tasks(__name__)
