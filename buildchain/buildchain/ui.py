# coding: utf-8

"""Tasks to build the MetalK8s UI.

Overview:

┌────┐    ┌───────┐    ┌──────────┐    ┌──────────────────┐
│ UI │───>│ mkdir │───>│ UI build │───>│ UI configuration │
└────┘    └───────┘    └──────────┘    └──────────────────┘
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


def task_ui() -> types.TaskDict:
    """Build the MetalK8s UI."""
    return {
        'actions': None,
        'task_dep': [
            '_ui_mkdir_build_root',
            '_ui_build',
            '_ui_config',
        ],
    }


def task__ui_mkdir_build_root() -> types.TaskDict:
    """Create the MetalK8s UI build root directory."""
    return targets.Mkdir(
        directory=constants.UI_BUILD_ROOT,
        user_mask=0o000,  # node user needs to be able to write in this folder
        task_dep=['_build_root'],
    ).task


def task__ui_build() -> types.TaskDict:
    """Build the MetalK8s UI NodeJS code."""
    def clean() -> None:
        coreutils.rm_rf(constants.UI_BUILD_ROOT)

    build_ui = docker_command.DockerRun(
        builder=builder.UI_BUILDER,
        command=['/entrypoint.sh'],
        run_config=docker_command.default_run_config(
            constants.ROOT/'ui'/'entrypoint.sh'
        ),
        mounts=[
            utils.bind_mount(
                target=Path('/home/node/build'),
                source=constants.UI_BUILD_ROOT,
            ),
        ],
    )

    return {
        'actions': [build_ui],
        'title': utils.title_with_target1('NPM BUILD'),
        'task_dep': [
            '_build_builder:{}'.format(builder.UI_BUILDER.name),
        ],
        'file_dep': list(utils.git_ls('ui')),
        'targets': [constants.UI_BUILD_ROOT/'index.html'],
        'clean': [clean],
    }


def task__ui_config() -> types.TaskDict:
    """Copy MetalK8s UI configuration to the build directory."""
    source = constants.ROOT/'images'/'metalk8s-ui'/'conf'/'nginx.conf'
    target = config.BUILD_ROOT/'metalk8s-ui-nginx.conf'

    return {
        'title': utils.title_with_target1('COPY'),
        'actions': [(coreutils.cp_file, (source, target))],
        'targets': [target],
        'task_dep': ['_build_root'],
        'file_dep': [source],
        'clean': True,
    }


__all__ = utils.export_only_tasks(__name__)
