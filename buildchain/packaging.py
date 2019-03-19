# coding: utf-8


"""Tasks to put repositories on the ISO.

This modules provides several services:
- build a unique container image for all the build tasks
- downloading packages and repositories
- building local packages from sources
- building local repositories from local packages

Note that for now, it only works for CentOS 7 x86_64.

Overview;

                                             (e.g.: base, …)
┌─────────┐               ┌──────────┐       ┌──────────────┐
│ builder │──────>│       │ download │       │    build     │
│  image  │       │──────>│ packages │──────>│ repositories │
└─────────┘       │       └──────────┘       └──────────────┘
                  │       ┌──────────┐       ┌──────────────┐
┌─────────┐       │──────>│  build   │──────>│    build     │
│  mkdir  │──────>│       │ packages │       │ repositories │
└─────────┘               └──────────┘       └──────────────┘
                          (e.g: calico)      (e.g.: scality)
"""


from buildchain import config
from buildchain import constants
from buildchain import targets
from buildchain import utils


def task_packaging() -> dict:
    """Build the packages and repositories."""
    return {
        'actions': None,
        'task_dep': [
            '_build_container',
            '_package_mkdir_root',
            '_package_mkdir_iso_root',
        ],
    }


def task__build_container() -> dict:
    """Build the container image used to build the packages/repositories."""
    task = BUILDER.task
    task.pop('name')  # `name` is only used for sub-task.
    return task


def task__package_mkdir_root() -> dict:
    """Create the packages root directory."""
    return targets.Mkdir(
        directory=constants.PKG_ROOT, task_dep=['_build_root']
    ).task


def task__package_mkdir_iso_root() -> dict:
    """Create the packages root directory on the ISO."""
    return targets.Mkdir(
        directory=constants.REPO_ROOT, task_dep=['_iso_mkdir_root']
    ).task


# Image used to build the packages
BUILDER : targets.LocalImage = targets.LocalImage(
    name='metalk8s-build',
    version='latest',
    dockerfile=constants.ROOT/'packages'/'Dockerfile',
    destination=config.BUILD_ROOT,
    save_on_disk=False,
    task_dep=['_build_root'],
    file_dep=list(constants.ROOT.glob('packages/yum_repositories/*.repo')),
)


__all__ = utils.export_only_tasks(__name__)
