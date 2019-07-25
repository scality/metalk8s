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
from typing import Dict, FrozenSet, Iterator, List, Tuple

from doit.tools import config_changed  # type: ignore

from buildchain import config
from buildchain import constants
from buildchain import coreutils
from buildchain import docker_command
from buildchain import targets
from buildchain import types
from buildchain import utils
from buildchain import versions


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

    mounts = [
        docker_command.bind_mount(
            source=constants.PKG_ROOT, target=Path('/install_root')
        ),
        docker_command.bind_mount(
            source=constants.REPO_ROOT, target=Path('/repositories')
        ),
    ]
    dl_packages_callable = docker_command.DockerRun(
        command=['/entrypoint.sh', 'download_packages', *TO_DOWNLOAD],
        builder=BUILDER,
        mounts=mounts,
        environment={'RELEASEVER': 7}
    )
    return {
        'title': lambda task: utils.title_with_target1('GET PKGS', task),
        'actions': [dl_packages_callable],
        'targets': [constants.PKG_ROOT/'var'],
        'task_dep': [
            '_package_mkdir_root', '_package_mkdir_iso_root', '_build_container'
        ],
        'clean': [clean],
        'uptodate': [config_changed(_TO_DOWNLOAD_CONFIG)],
        # Prevent Docker from polluting our output.
        'verbosity': 0,
    }


def task__build_packages() -> Iterator[types.TaskDict]:
    """Build a package."""
    for repo_pkgs in TO_BUILD.values():
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
        constants.ROOT/'packages/yum_repositories/saltstack.repo',
    ],
    build_args={
        # Used to template the SaltStack repository definition
        'SALT_VERSION': versions.SALT_VERSION,
    },
)

# Packages to build, per repository.
def _package(name: str, sources: List[Path]) -> targets.Package:
    try:
        pkg_info = versions.PACKAGES_MAP[name]
    except KeyError:
        raise ValueError(
            'Missing version for package "{}"'.format(name)
        )

    # In case the `release` is of form "{build_id}.{os}", which is standard
    build_id_str, _, _ = pkg_info.release.partition('.')

    return targets.Package(
        basename='_build_packages',
        name=name,
        version=pkg_info.version,
        build_id=int(build_id_str),
        sources=sources,
        builder=BUILDER,
        task_dep=['_package_mkdir_root', '_build_container'],
    )

TO_BUILD : Dict[str, Tuple[targets.Package, ...]] = {
    'scality': (
        # SOS report custom plugins.
        _package(
            name='metalk8s-sosreport',
            sources=[
                Path('metalk8s.py'),
                Path('containerd.py'),
            ],
        ),
        # Calico Container Network Interface Plugin.
        _package(
            name='calico-cni-plugin',
            sources=[
                Path('calico-amd64'),
                Path('calico-ipam-amd64'),
                Path('v{}.tar.gz'.format(versions.CALICO_VERSION)),
            ],
        ),
    ),
}

_TO_BUILD_PKG_NAMES : List[str] = []

for pkgs in TO_BUILD.values():
    for pkg in pkgs:
        _TO_BUILD_PKG_NAMES.append(pkg.name)

# All packages not referenced in `TO_BUILD` but listed in `versions.PACKAGES`
# are supposed to be downloaded.
TO_DOWNLOAD : FrozenSet[str] = frozenset(
    "{p.name}-{p.version}-{p.release}".format(p=package)
    for package in versions.PACKAGES
    if package.name not in _TO_BUILD_PKG_NAMES
)

# Store these versions in a dict to use with doit.tools.config_changed
_TO_DOWNLOAD_CONFIG : Dict[str, str] = {
    pkg.name: "{p.version}-{p.release}".format(p=pkg)
    for pkg in versions.PACKAGES
    if pkg.name not in _TO_BUILD_PKG_NAMES
}


REPOSITORIES : Tuple[targets.Repository, ...] = (
    targets.Repository(
        basename='_build_repositories',
        name='scality',
        builder=BUILDER,
        packages=TO_BUILD['scality'],
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


__all__ = utils.export_only_tasks(__name__)
