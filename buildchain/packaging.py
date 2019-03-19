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


from pathlib import Path
from typing import Dict, Iterator, List, Tuple

import doit  # type: ignore

from buildchain import config
from buildchain import constants
from buildchain import coreutils
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
            '_download_packages',
            '_build_packages:*',
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


def task__download_packages() -> dict:
    """Download packages locally."""
    def clean() -> None:
        """Delete cache and repositories on the ISO."""
        coreutils.rm_rf(constants.PKG_ROOT/'var')
        # TODO: clean repositories as well.

    pkg_list = constants.ROOT/'packages/packages.list'
    packages = _load_package_list(pkg_list)
    cmd = list(constants.BUILDER_BASIC_CMD)
    cmd.extend([
        '--env', 'RELEASEVER=7', \
        '--mount', 'type=bind,source={},destination=/install_root'.format(
            constants.PKG_ROOT
        ),
        '--mount', 'type=bind,source={},destination=/repositories'.format(
            constants.REPO_ROOT
        ),
        BUILDER.tag,
        '/entrypoint.sh', 'download_packages'
    ])
    cmd.extend(packages)
    return {
        'title': lambda task: utils.title_with_target1('GET PKGS', task),
        'actions': [cmd],
        'targets': [constants.PKG_ROOT/'var'],
        'file_dep': [BUILDER.destination, pkg_list],
        'task_dep': ['_package_mkdir_root', '_package_mkdir_iso_root'],
        'clean': [clean],
        'uptodate': [doit.tools.run_once],
        # Prevent Docker from polluting our output.
        'verbosity': 0,
    }


def task__build_packages() -> Iterator[dict]:
    """Build a package."""
    for repo_pkgs in PACKAGES.values():
        for package in repo_pkgs:
            yield from package.execution_plan


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


CALICO_CNI_PLUGIN_VERSION : str = '3.5.1'
# Packages per repository.
PACKAGES : Dict[str, Tuple[targets.Package, ...]] = {
    'scality': (
        # Calico CNI Plugin.
        targets.Package(
            basename='_build_packages',
            name='calico-cni-plugin',
            version=CALICO_CNI_PLUGIN_VERSION,
            build_id=1,
            sources=[
                Path('calico-amd64'),
                Path('calico-ipam-amd64'),
                Path('v{}.tar.gz'.format(CALICO_CNI_PLUGIN_VERSION)),
            ],
            builder=BUILDER,
            task_dep=['_package_mkdir_root'],
        ),
    ),
}


def _load_package_list(pkg_list: Path) -> List[str]:
    """Load the list of packages to download.

    Arguments:
        pkg_list: path to the file that contains the package list

    Returns:
        A list of package names.
    """
    packages : List[str] = []
    with pkg_list.open('r', encoding='utf-8') as fp:
        for line in fp:
            packages.append(line.strip())
    return packages


__all__ = utils.export_only_tasks(__name__)
