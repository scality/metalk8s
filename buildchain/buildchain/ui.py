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
    task = targets.Mkdir(
        directory=constants.UI_BUILD_ROOT, task_dep=['_build_root'],
    ).task
    # `node` user in the container needs to be able to write in this folder.
    task['actions'].append(lambda: constants.UI_BUILD_ROOT.chmod(0o777))
    return task


def task__ui_build() -> types.TaskDict:
    """Build the MetalK8s UI NodeJS code."""
    def clean() -> None:
        run_ui_builder('clean')()

    return {
        'actions': [run_ui_builder('build')],
        'title': utils.title_with_target1('NPM BUILD'),
        'task_dep': [
            '_build_builder:{}'.format(builder.UI_BUILDER.name),
            '_ui_mkdir_build_root',
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


def run_ui_builder(cmd: str) -> docker_command.DockerRun:
    """Return a DockerRun instance of the UI builder for the given command."""
    return docker_command.DockerRun(
        builder=builder.UI_BUILDER,
        command=['/entrypoint.sh', cmd],
        run_config=docker_command.default_run_config(
            constants.ROOT/'ui'/'entrypoint.sh'
        ),
        mounts=[
            utils.bind_mount(
                target=Path('/home/node/build'),
                source=constants.UI_BUILD_ROOT,
            ),
        ] + [
            utils.bind_ro_mount(
                target=Path('/home/node') / path,
                source=constants.ROOT/'ui'/path,
            )
            for path in ['public', 'src', 'config-overrides.js', '.babelrc']
        ],
    )


__all__ = utils.export_only_tasks(__name__)
