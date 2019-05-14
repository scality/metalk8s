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

from buildchain import config
from buildchain import constants
from buildchain import coreutils
from buildchain import targets
from buildchain import types
from buildchain import utils
from buildchain import docker_command


def task_packaging() -> types.TaskDict:
    """Build the packages and repositories."""
    return {
        'actions': None,
        'task_dep': [
            '_build_container',
            '_package_mkdir_root',
            '_package_mkdir_iso_root',
            '_download_packages',
            '_build_packages:*',
            '_build_repositories:*',
        ],
    }


def task__build_container() -> types.TaskDict:
    """Build the container image used to build the packages/repositories."""
    task = BUILDER.task
    task.pop('name')  # `name` is only used for sub-task.
    return task


def task__package_mkdir_root() -> types.TaskDict:
    """Create the packages root directory."""
    return targets.Mkdir(
        directory=constants.PKG_ROOT, task_dep=['_build_root']
    ).task


def task__package_mkdir_iso_root() -> types.TaskDict:
    """Create the packages root directory on the ISO."""
    return targets.Mkdir(
        directory=constants.REPO_ROOT, task_dep=['_iso_mkdir_root']
    ).task


def task__download_packages() -> types.TaskDict:
    """Download packages locally."""
    def clean() -> None:
        """Delete cache and repositories on the ISO."""
        coreutils.rm_rf(constants.PKG_ROOT/'var')
        for repository in REPOSITORIES:
            # Repository with an explicit list of packages are created by a
            # dedicated task that will also handle their cleaning, so we skip
            # them here.
            if repository.packages:
                continue
            coreutils.rm_rf(repository.rootdir)

    pkg_list = constants.ROOT/'packages/packages.list'
    packages = _load_package_list(pkg_list)

    mounts = [
        docker_command.bind_mount(
            source=constants.PKG_ROOT, target=Path('/install_root')
        ),
        docker_command.bind_mount(
            source=constants.REPO_ROOT, target=Path('/repositories')
        ),
    ]
    dl_packages_callable = docker_command.DockerRun(
        command=['/entrypoint.sh', 'download_packages', *packages],
        builder=BUILDER,
        mounts=mounts,
        environment={'RELEASEVER': 7}
    )
    return {
        'title': lambda task: utils.title_with_target1('GET PKGS', task),
        'actions': [dl_packages_callable],
        'targets': [constants.PKG_ROOT/'var'],
        'file_dep': [pkg_list],
        'task_dep': [
            '_package_mkdir_root', '_package_mkdir_iso_root', '_build_container'
        ],
        'clean': [clean],
        'uptodate': [True],
        # Prevent Docker from polluting our output.
        'verbosity': 0,
    }


def task__build_packages() -> Iterator[types.TaskDict]:
    """Build a package."""
    for repo_pkgs in PACKAGES.values():
        for package in repo_pkgs:
            yield from package.execution_plan


def task__build_repositories() -> Iterator[types.TaskDict]:
    """Build a repository."""
    for repository in REPOSITORIES:
        yield from repository.execution_plan


# Image used to build the packages
BUILDER : targets.LocalImage = targets.LocalImage(
    name='metalk8s-build',
    version='latest',
    dockerfile=constants.ROOT/'packages'/'Dockerfile',
    destination=config.BUILD_ROOT,
    save_on_disk=False,
    task_dep=['_build_root'],
    file_dep=[
        constants.ROOT/'packages/yum_repositories/kubernetes.repo',
        constants.ROOT/'packages/yum_repositories/saltstack.repo'
    ],
)


CALICO_CNI_PLUGIN_VERSION : str = '3.7.2'
# Packages per repository.
PACKAGES : Dict[str, Tuple[targets.Package, ...]] = {
    'scality': (
        # Calico Container Network Interface Plugin.
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
            task_dep=['_package_mkdir_root', '_build_container'],
        ),
    ),
}


REPOSITORIES : Tuple[targets.Repository, ...] = (
    targets.Repository(
        basename='_build_repositories',
        name='scality',
        builder=BUILDER,
        packages=PACKAGES['scality'],
        task_dep=['_package_mkdir_iso_root'],
    ),
    targets.Repository(
        basename='_build_repositories',
        name='base',
        builder=BUILDER,
        task_dep=['_download_packages'],
    ),
    targets.Repository(
        basename='_build_repositories',
        name='external',
        builder=BUILDER,
        task_dep=['_download_packages'],
    ),
    targets.Repository(
        basename='_build_repositories',
        name='extras',
        builder=BUILDER,
        task_dep=['_download_packages'],
    ),
    targets.Repository(
        basename='_build_repositories',
        name='updates',
        builder=BUILDER,
        task_dep=['_download_packages'],
    ),
    targets.Repository(
        basename='_build_repositories',
        name='epel',
        builder=BUILDER,
        task_dep=['_download_packages'],
    ),
    targets.Repository(
        basename='_build_repositories',
        name='kubernetes',
        builder=BUILDER,
        task_dep=['_download_packages'],
    ),
    targets.Repository(
        basename='_build_repositories',
        name='saltstack',
        builder=BUILDER,
        task_dep=['_download_packages'],
    ),
)


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
