# coding: utf-8

"""Tasks to build the Shell UI.

Overview:

┌──────────┐    ┌───────┐    ┌───────┐
│ shell-UI │───>│ mkdir │───>│ build │
└──────────┘    └───────┘    └───────┘
"""

from buildchain import builder
from buildchain import constants
from buildchain import docker_command
from buildchain import targets
from buildchain import types
from buildchain import utils
from buildchain import ui


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
        "targets": [
            constants.SHELL_UI_BUILD_ROOT / "shell" / "index.html",
        ],
        "clean": [clean],
    }


def run_shell_ui_builder(cmd: str) -> docker_command.DockerRun:
    """Return a DockerRun instance of the Shell UI builder for the given command."""
    return ui.run_nodejs_builder(
        cmd=cmd,
        builder=builder.SHELL_UI_BUILDER,
        source_dir=constants.ROOT / "shell-ui",
        build_dir=constants.SHELL_UI_BUILD_ROOT,
        entrypoint="../ui/entrypoint.sh",
        source_mounts=[
            "src",
            "index-template.html",
            "webpack.common.js",
            "webpack.config.prd.js",
            "babel.config.js",
            ".flowconfig",
        ],
    )


__all__ = utils.export_only_tasks(__name__)
