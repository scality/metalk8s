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
from typing import (
    Dict, FrozenSet, Iterator, List, Mapping, Optional, Sequence, Tuple
)

import doit  # type: ignore

from buildchain import builder
from buildchain import constants
from buildchain import coreutils
from buildchain import docker_command
from buildchain import targets
from buildchain import types
from buildchain import utils
from buildchain import versions


# Utilities {{{

def _list_packages_to_build(
    pkg_cats: Mapping[str, Tuple[targets.Package, ...]]
) -> List[str]:
    return [
        pkg.name for pkg_list in pkg_cats.values() for pkg in pkg_list
    ]


def _list_packages_to_download(
    package_versions: Tuple[versions.PackageVersion, ...],
    packages_to_build: List[str]
) -> Dict[str, Optional[str]]:
    return {
        pkg.name: pkg.full_version
        for pkg in package_versions
        if pkg.name not in packages_to_build
    }

# }}}
# Tasks {{{

def task_packaging() -> types.TaskDict:
    """Build the packages and repositories."""
    return {
        'actions': None,
        'task_dep': [
            '_package_mkdir_root',
            '_package_mkdir_iso_root',
            '_download_rpm_packages',
            '_build_rpm_packages',
            '_build_rpm_repositories',
            '_build_deb_packages',
            '_download_deb_packages',
            '_build_deb_repositories',
        ],
    }

def task__package_mkdir_root() -> types.TaskDict:
    """Create the packages root directory."""
    return targets.Mkdir(
        directory=constants.PKG_ROOT, task_dep=['_build_root']
    ).task

def task__package_mkdir_rpm_root() -> types.TaskDict:
    """Create the RedHat packages root directory."""
    return targets.Mkdir(
        directory=constants.PKG_RPM_ROOT, task_dep=['_package_mkdir_root']
    ).task

def task__package_mkdir_deb_root() -> types.TaskDict:
    """Create the Debian packages root directory."""
    return targets.Mkdir(
        directory=constants.PKG_DEB_ROOT, task_dep=['_package_mkdir_root']
    ).task

def task__package_mkdir_iso_root() -> types.TaskDict:
    """Create the packages root directory on the ISO."""
    return targets.Mkdir(
        directory=constants.REPO_ROOT, task_dep=['_iso_mkdir_root']
    ).task

def task__package_mkdir_rpm_iso_root() -> types.TaskDict:
    """Create the RedHat packages root directory on the ISO."""
    return targets.Mkdir(
        directory=constants.REPO_RPM_ROOT, task_dep=['_package_mkdir_iso_root']
    ).task

def task__package_mkdir_deb_iso_root() -> types.TaskDict:
    """Create the Debian packages root directory on the ISO."""
    return targets.Mkdir(
        directory=constants.REPO_DEB_ROOT, task_dep=['_package_mkdir_iso_root']
    ).task

def task__download_rpm_packages() -> types.TaskDict:
    """Download packages locally."""
    def clean() -> None:
        """Delete cache and repositories on the ISO."""
        coreutils.rm_rf(constants.PKG_RPM_ROOT/'var')
        for repository in RPM_REPOSITORIES:
            # Repository with an explicit list of packages are created by a
            # dedicated task that will also handle their cleaning, so we skip
            # them here.
            if repository.packages:
                continue
            coreutils.rm_rf(repository.rootdir)

    mounts = [
        utils.bind_mount(
            source=constants.PKG_RPM_ROOT, target=Path('/install_root')
        ),
        utils.bind_mount(
            source=constants.REPO_RPM_ROOT, target=Path('/repositories')
        ),
    ]
    dl_packages_callable = docker_command.DockerRun(
        command=['/entrypoint.sh', 'download_packages', *RPM_TO_DOWNLOAD],
        builder=builder.RPM_BUILDER,
        mounts=mounts,
        environment={'RELEASEVER': 7},
        run_config=docker_command.default_run_config(
            constants.REDHAT_ENTRYPOINT
        )
    )
    return {
        'title': utils.title_with_target1('GET RPM PKGS'),
        'actions': [dl_packages_callable],
        'targets': [constants.PKG_RPM_ROOT/'var'],
        'task_dep': [
            '_package_mkdir_rpm_root',
            '_package_mkdir_rpm_iso_root',
            '_build_builder:{}'.format(builder.RPM_BUILDER.name),
        ],
        'clean': [clean],
        'uptodate': [doit.tools.config_changed(_TO_DOWNLOAD_RPM_CONFIG)],
        # Prevent Docker from polluting our output.
        'verbosity': 0,
    }


def task__download_deb_packages() -> types.TaskDict:
    """Download Debian packages locally."""
    witness = constants.PKG_DEB_ROOT/'.witness'

    def clean() -> None:
        """Delete downloaded Debian packages."""
        for repository in DEB_REPOSITORIES:
            # Repository with an explicit list of packages are created by a
            # dedicated task that will also handle their cleaning, so we skip
            # them here.
            if repository.packages:
                continue
            coreutils.rm_rf(repository.pkgdir)
        utils.unlink_if_exist(witness)
        constants.REPO_DEB_ROOT.rmdir()

    def mkdirs() -> None:
        """Create directories for the repositories."""
        for repository in DEB_REPOSITORIES:
            repository.pkgdir.mkdir(exist_ok=True)

    mounts = [
        utils.bind_ro_mount(
            source=constants.ROOT/'packages'/'debian'/'download_packages.py',
            target=Path('/download_packages.py'),
        ),
        utils.bind_mount(
            source=constants.PKG_DEB_ROOT,
            target=Path('/repositories')
        ),
    ]
    dl_packages_callable = docker_command.DockerRun(
        command=['/download_packages.py', *DEB_TO_DOWNLOAD],
        builder=builder.DEB_BUILDER,
        mounts=mounts,
        environment={'SALT_VERSION': versions.SALT_VERSION},
        run_config=docker_command.default_run_config(
            constants.DEBIAN_ENTRYPOINT
        )
    )
    return {
        'title': utils.title_with_target1('GET DEB PKGS'),
        'actions': [mkdirs, dl_packages_callable],
        'targets': [constants.PKG_DEB_ROOT/'.witness'],
        'task_dep': [
            '_package_mkdir_deb_root',
            '_package_mkdir_deb_iso_root',
            '_build_builder:{}'.format(builder.DEB_BUILDER.name),
        ],
        'clean': [clean],
        'uptodate': [doit.tools.config_changed(_TO_DOWNLOAD_DEB_CONFIG)],
        # Prevent Docker from polluting our output.
        'verbosity': 0,
    }


def task__build_rpm_packages() -> Iterator[types.TaskDict]:
    """Build a RPM package."""
    for repo_pkgs in RPM_TO_BUILD.values():
        for package in repo_pkgs:
            yield from package.execution_plan


def task__build_deb_packages() -> Iterator[types.TaskDict]:
    """Build Debian packages"""
    for repo_pkgs in DEB_TO_BUILD.values():
        for package in repo_pkgs:
            yield from package.execution_plan


def task__build_rpm_repositories() -> Iterator[types.TaskDict]:
    """Build a RPM repository."""
    for repository in RPM_REPOSITORIES:
        yield from repository.execution_plan


@doit.create_after(executed='_download_deb_packages')  # type: ignore
def task__build_deb_repositories() -> Iterator[types.TaskDict]:
    """Build a DEB repository."""
    for repository in DEB_REPOSITORIES:
        if next(repository.pkgdir.glob('*.deb'), False):
            yield from repository.execution_plan

# }}}
# RPM packages and repository {{{

# Packages to build, per repository.
def _rpm_package(name: str, sources: List[Path]) -> targets.RPMPackage:
    try:
        pkg_info = versions.RPM_PACKAGES_MAP[name]
    except KeyError:
        raise ValueError(
            'Missing version for package "{}"'.format(name)
        )

    # In case the `release` is of form "{build_id}.{os}", which is standard
    build_id_str, _, _ = pkg_info.release.partition('.')

    return targets.RPMPackage(
        basename='_build_rpm_packages',
        name=name,
        version=pkg_info.version,
        build_id=int(build_id_str),
        sources=sources,
        builder=builder.RPM_BUILDER,
        task_dep=[
            '_package_mkdir_rpm_root',
            '_build_builder:{}'.format(builder.RPM_BUILDER.name)
        ],
    )


def _rpm_repository(
    name: str, packages: Optional[Sequence[targets.RPMPackage]]=None
) -> targets.RPMRepository:
    """Return a RPM repository object.

    Arguments:
        name:     repository name
        packages: list of locally built packages
    """
    mkdir_task = '_package_mkdir_rpm_iso_root'
    download_task = '_download_rpm_packages'
    return targets.RPMRepository(
        basename='_build_rpm_repositories',
        name=name,
        builder=builder.RPM_BUILDER,
        packages=packages,
        task_dep=[download_task if packages is None else mkdir_task],
    )


# Calico Container Network Interface Plugin.
CALICO_RPM = _rpm_package(
    name='calico-cni-plugin',
    sources=[
        Path('calico-amd64'),
        Path('calico-ipam-amd64'),
        Path('v{}.tar.gz'.format(versions.CALICO_VERSION)),
    ],
)

RPM_TO_BUILD : Dict[str, Tuple[targets.RPMPackage, ...]] = {
    'scality': (
        # SOS report custom plugins.
        _rpm_package(
            name='metalk8s-sosreport',
            sources=[
                Path('metalk8s.py'),
                Path('containerd.py'),
            ],
        ),
        CALICO_RPM
    ),
}


_RPM_TO_BUILD_PKG_NAMES : List[str] = _list_packages_to_build(RPM_TO_BUILD)

# All packages not referenced in `RPM_TO_BUILD` but listed in
# `versions.RPM_PACKAGES` are supposed to be downloaded.
RPM_TO_DOWNLOAD : FrozenSet[str] = frozenset(
    package.rpm_full_name
    for package in versions.RPM_PACKAGES
    if package.name not in _RPM_TO_BUILD_PKG_NAMES
)


# Store these versions in a dict to use with doit.tools.config_changed
_TO_DOWNLOAD_RPM_CONFIG: Dict[str, Optional[str]] = \
    _list_packages_to_download(versions.RPM_PACKAGES, _RPM_TO_BUILD_PKG_NAMES)


SCALITY_RPM_REPOSITORY : targets.RPMRepository = _rpm_repository(
    name='scality', packages=RPM_TO_BUILD['scality']
)


RPM_REPOSITORIES : Tuple[targets.RPMRepository, ...] = (
    SCALITY_RPM_REPOSITORY,
    _rpm_repository(name='epel'),
    _rpm_repository(name='kubernetes'),
    _rpm_repository(name='saltstack'),
)


# }}}
# Debian packages and repositories {{{

def _deb_package(name: str, sources: Path) -> targets.DEBPackage:
    try:
        pkg_info = versions.DEB_PACKAGES_MAP[name]
    except KeyError:
        raise ValueError(
            'Missing version for package "{}"'.format(name)
        )

    return targets.DEBPackage(
        basename='_build_deb_packages',
        name=name,
        version=pkg_info.version,
        build_id=int(pkg_info.release),
        sources=sources,
        builder=builder.DEB_BUILDER,
        task_dep=[
            '_package_mkdir_deb_root',
            '_build_builder:{}'.format(builder.DEB_BUILDER.name)
        ],
    )


def _deb_repository(
    name: str, packages: Optional[Sequence[targets.DEBPackage]]=None
) -> targets.DEBRepository:
    """Return a DEB repository object.

    Arguments:
        name:     repository name
        packages: list of locally built packages
    """
    mkdir_task = '_package_mkdir_deb_iso_root'
    download_task = '_download_deb_packages'
    return targets.DEBRepository(
        basename='_build_deb_repositories',
        name=name,
        builder=builder.DEB_BUILDER,
        packages=packages,
        task_dep=[download_task if packages is None else mkdir_task],
    )


DEB_TO_BUILD : Dict[str, Tuple[targets.DEBPackage, ...]] = {
    'scality': (
        # SOS report custom plugins.
        _deb_package(
            name='metalk8s-sosreport',
            sources=constants.ROOT/'packages/common/metalk8s-sosreport',
        ),
        _deb_package(
            name='calico-cni-plugin',
            sources=SCALITY_RPM_REPOSITORY.get_rpm_path(CALICO_RPM)
        ),
    )
}


_DEB_TO_BUILD_PKG_NAMES : List[str] = _list_packages_to_build(DEB_TO_BUILD)


# Store these versions in a dict to use with doit.tools.config_changed
_TO_DOWNLOAD_DEB_CONFIG: Dict[str, Optional[str]] = \
    _list_packages_to_download(versions.DEB_PACKAGES, _DEB_TO_BUILD_PKG_NAMES)


DEB_TO_DOWNLOAD : FrozenSet[str] = frozenset(
    package.deb_full_name
    for package in versions.DEB_PACKAGES
    if package.name not in _DEB_TO_BUILD_PKG_NAMES
)


DEB_REPOSITORIES : Tuple[targets.DEBRepository, ...] = (
    _deb_repository(name='scality', packages=DEB_TO_BUILD['scality']),
    _deb_repository(name='bionic'),
    _deb_repository(name='bionic-backports'),
    _deb_repository(name='bionic-security'),
    _deb_repository(name='bionic-updates'),
    _deb_repository(name='kubernetes-xenial'),
    _deb_repository(name='salt_ubuntu1804'),
)

# }}}

__all__ = utils.export_only_tasks(__name__)
