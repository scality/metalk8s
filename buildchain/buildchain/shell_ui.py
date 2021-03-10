# coding: utf-8

"""Tasks to build the Shell UI.

Overview:

┌──────────┐    ┌───────┐    ┌───────┐
│ shell-UI │───>│ mkdir │───>│ build │
└──────────┘    └───────┘    └───────┘
"""


from pathlib import Path

from buildchain import builder
from buildchain import config
from buildchain import constants
from buildchain import coreutils
from buildchain import docker_command
from buildchain import targets
from buildchain import types
from buildchain import utils


def task_shell_ui() -> types.TaskDict:
    """Build the Shell UI."""
    return {
        "actions": None,
        "task_dep": [
            "_shell_ui_mkdir_build_root",
            "_shell_ui_build",
        ],
    }


def task__shell_ui_mkdir_build_root() -> types.TaskDict:
    """Create the Shell UI build root directory."""
    task = targets.Mkdir(
        directory=constants.SHELL_UI_BUILD_ROOT,
        task_dep=["_build_root"],
    ).task
    # `node` user in the container needs to be able to write in this folder.
    task["actions"].append(lambda: constants.SHELL_UI_BUILD_ROOT.chmod(0o777))
    return task


def task__shell_ui_build() -> types.TaskDict:
    """Build the Shell UI code."""

    def clean() -> None:
        run_shell_ui_builder("clean")()

    return {
        "actions": [run_shell_ui_builder("build")],
        "title": utils.title_with_target1("NPM BUILD"),
        "task_dep": [
            "_build_builder:{}".format(builder.SHELL_UI_BUILDER.name),
            "_shell_ui_mkdir_build_root",
        ],
        "file_dep": list(utils.git_ls("shell-ui")),
        "targets": [constants.SHELL_UI_BUILD_ROOT / "index.html"],
        "clean": [clean],
    }


def run_shell_ui_builder(cmd: str) -> docker_command.DockerRun:
    """Return a DockerRun instance of the UI builder for the given command."""
    return docker_command.DockerRun(
        builder=builder.SHELL_UI_BUILDER,
        command=["/entrypoint.sh", cmd],
        run_config=docker_command.default_run_config(
            constants.ROOT / "ui" / "entrypoint.sh"
        ),
        mounts=[
            utils.bind_mount(
                target=Path("/home/node/build"),
                source=constants.SHELL_UI_BUILD_ROOT,
            ),
        ]
        + [
            utils.bind_ro_mount(
                target=Path("/home/node") / path,
                source=constants.ROOT / "shell-ui" / path,
            )
            for path in [
                "src",
                "webpack.config.prd.js",
                "babel.config.js",
                ".flowconfig",
            ]
        ],
    )


__all__ = utils.export_only_tasks(__name__)
