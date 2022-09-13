# coding: utf-8


"""Tasks for code generation."""


import shlex
from typing import Callable, Iterator, Tuple

import doit  # type: ignore

from buildchain import constants
from buildchain import types
from buildchain import utils


def get_task_information() -> types.TaskDict:
    """Retrieve all the task information from codegen"""
    result: types.TaskDict = {
        "actions": [],
        "task_dep": [],
        "file_dep": [],
    }
    for task_fun in CODEGEN:
        task = task_fun()
        for key, value in result.items():
            value.extend(task.get(key, []))

    return result


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


def codegen_chart_dex() -> types.TaskDict:
    """Generate the SLS file for Dex using the chart render script."""
    target_sls = constants.ROOT / "salt/metalk8s/addons/dex/deployed/chart.sls"
    chart_dir = constants.CHART_ROOT / "dex"
    value_file = constants.CHART_ROOT / "dex.yaml"
    cmd = (
        f"{constants.CHART_RENDER_CMD} dex {value_file} {chart_dir} "
        "--namespace metalk8s-auth "
        "--service-config dex metalk8s-dex-config "
        "metalk8s/addons/dex/config/dex.yaml.j2 metalk8s-auth "
        f"--output {target_sls}"
    )

    file_dep = list(utils.git_ls(chart_dir))
    file_dep.append(value_file)
    file_dep.append(constants.CHART_RENDER_SCRIPT)

    return {
        "name": "chart_dex",
        "title": utils.title_with_subtask_name("CODEGEN"),
        "doc": codegen_chart_dex.__doc__,
        "actions": [doit.action.CmdAction(cmd)],
        "file_dep": file_dep,
        "task_dep": ["check_for:tox", "check_for:helm"],
    }


def codegen_chart_fluent_bit() -> types.TaskDict:
    """Generate the SLS file for fluent-bit using the chart render script."""
    target_sls = (
        constants.ROOT / "salt/metalk8s/addons/logging/fluent-bit/deployed/chart.sls"
    )
    chart_dir = constants.CHART_ROOT / "fluent-bit"
    value_file = constants.CHART_ROOT / "fluent-bit.yaml"
    cmd = (
        f"{constants.CHART_RENDER_CMD} fluent-bit {value_file} {chart_dir} "
        "--namespace metalk8s-logging "
        "--service-config fluent_bit metalk8s-fluent-bit-config "
        "metalk8s/addons/logging/fluent-bit/config/fluent-bit.yaml metalk8s-logging "
        f"--output {target_sls}"
    )

    file_dep = list(utils.git_ls(chart_dir))
    file_dep.append(value_file)
    file_dep.append(constants.CHART_RENDER_SCRIPT)

    return {
        "name": "chart_fluent-bit",
        "title": utils.title_with_subtask_name("CODEGEN"),
        "doc": codegen_chart_fluent_bit.__doc__,
        "actions": [doit.action.CmdAction(cmd)],
        "file_dep": file_dep,
        "task_dep": ["check_for:tox", "check_for:helm"],
    }


# List of available code generation tasks.
CODEGEN: Tuple[Callable[[], types.TaskDict], ...] = (
    codegen_storage_operator,
    codegen_metalk8s_operator,
    codegen_chart_dex,
    codegen_chart_fluent_bit,
)


__all__ = utils.export_only_tasks(__name__)
