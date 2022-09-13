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


def codegen_chart_ingress_nginx() -> types.TaskDict:
    """Generate the SLS file for NGINX Ingress using the chart render script."""
    chart_dir = constants.CHART_ROOT / "ingress-nginx"
    actions = []
    file_dep = list(utils.git_ls(chart_dir))
    file_dep.append(constants.CHART_RENDER_SCRIPT)

    # Workload Plane Ingress
    target_sls = (
        constants.ROOT / "salt/metalk8s/addons/nginx-ingress/deployed/chart.sls"
    )
    value_file = constants.CHART_ROOT / "ingress-nginx.yaml"
    actions.append(
        doit.action.CmdAction(
            f"{constants.CHART_RENDER_CMD} ingress-nginx {value_file} "
            f"{chart_dir} --namespace metalk8s-ingress --output {target_sls}"
        )
    )
    file_dep.append(value_file)

    # Control Plane Ingress Deployment
    target_sls = (
        constants.ROOT
        / "salt/metalk8s/addons/nginx-ingress-control-plane"
        / "deployed/chart-deployment.sls"
    )
    value_file = constants.CHART_ROOT / "ingress-nginx-control-plane-deployment.yaml"
    actions.append(
        doit.action.CmdAction(
            f"{constants.CHART_RENDER_CMD} ingress-nginx-control-plane {value_file} "
            f"{chart_dir} --namespace metalk8s-ingress --output {target_sls}"
        )
    )
    file_dep.append(value_file)

    # Control Plane Ingress DaemonSet
    target_sls = (
        constants.ROOT
        / "salt/metalk8s/addons/nginx-ingress-control-plane"
        / "deployed/chart-daemonset.sls"
    )
    value_file = constants.CHART_ROOT / "ingress-nginx-control-plane-daemonset.yaml"
    actions.append(
        doit.action.CmdAction(
            f"{constants.CHART_RENDER_CMD} ingress-nginx-control-plane {value_file} "
            f"{chart_dir} --namespace metalk8s-ingress --output {target_sls}"
        )
    )
    file_dep.append(value_file)

    return {
        "name": "chart_ingress-nginx",
        "title": utils.title_with_subtask_name("CODEGEN"),
        "doc": codegen_chart_ingress_nginx.__doc__,
        "actions": actions,
        "file_dep": file_dep,
        "task_dep": ["check_for:tox", "check_for:helm"],
    }


def codegen_chart_kube_prometheus_stack() -> types.TaskDict:
    """Generate the SLS file for Kube Prometheus Stack using the chart render script."""
    target_sls = (
        constants.ROOT / "salt/metalk8s/addons/prometheus-operator/deployed/chart.sls"
    )
    chart_dir = constants.CHART_ROOT / "kube-prometheus-stack"
    value_file = constants.CHART_ROOT / "kube-prometheus-stack.yaml"
    drop_rule_file = constants.CHART_ROOT / "drop-prometheus-rules.yaml"
    cmd = (
        f"{constants.CHART_RENDER_CMD} prometheus-operator {value_file} {chart_dir} "
        "--namespace metalk8s-monitoring "
        "--service-config grafana metalk8s-grafana-config "
        "metalk8s/addons/prometheus-operator/config/grafana.yaml.j2 "
        "metalk8s-monitoring "
        "--service-config prometheus  metalk8s-prometheus-config "
        "metalk8s/addons/prometheus-operator/config/prometheus.yaml "
        "metalk8s-monitoring "
        "--service-config alertmanager metalk8s-alertmanager-config "
        "metalk8s/addons/prometheus-operator/config/alertmanager.yaml "
        "metalk8s-monitoring "
        "--patch 'PrometheusRule,metalk8s-monitoring,"
        "prometheus-operator-kubernetes-system-kubelet,"
        'spec:groups:0:rules:1:for,"5m"\' '
        "--remove-manifest ConfigMap prometheus-operator-grafana "
        f"--drop-prometheus-rules {drop_rule_file} "
        f"--output {target_sls}"
    )

    file_dep = list(utils.git_ls(chart_dir))
    file_dep.append(value_file)
    file_dep.append(constants.CHART_RENDER_SCRIPT)
    file_dep.append(drop_rule_file)

    return {
        "name": "chart_kube-prometheus-stack",
        "title": utils.title_with_subtask_name("CODEGEN"),
        "doc": codegen_chart_kube_prometheus_stack.__doc__,
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
    codegen_chart_ingress_nginx,
    codegen_chart_kube_prometheus_stack,
)


__all__ = utils.export_only_tasks(__name__)
