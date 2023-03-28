# coding: utf-8


"""Tasks to put repositories on the ISO.

This modules provides several services:
- build a unique container image for all the build tasks
- downloading packages and repositories
- building local packages from sources
- building local repositories from local packages

Note that for now, it only works for CentOS/RedHat 7 and 8 x86_64.

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
                        (e.g: containerd)     (e.g.: scality)
"""


from pathlib import Path
from typing import Dict, FrozenSet, Iterator, List, Mapping, Optional, Sequence, Tuple

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
    pkg_cats: Mapping[str, Mapping[str, Tuple[targets.Package, ...]]]
) -> Dict[str, List[str]]:
    return {
        version: [pkg.name for pkg in pkg_list]
        for pkg_versions in pkg_cats.values()
        for version, pkg_list in pkg_versions.items()
    }


def _list_packages_to_download(
    package_versions: Dict[str, Tuple[versions.PackageVersion, ...]],
    packages_to_build: Dict[str, List[str]],
) -> Dict[str, Dict[str, Optional[str]]]:
    return {
        version: {
            pkg.name: pkg.full_version
            for pkg in pkgs
            if pkg.name not in packages_to_build[version]
        }
        for version, pkgs in package_versions.items()
    }


# }}}
# Tasks {{{


def task_packaging() -> types.TaskDict:
    """Build the packages and repositories."""
    return {
        "actions": None,
        "task_dep": [
            "_download_packages",
            "_build_packages",
            "_build_repositories",
        ],
    }


def task__build_packages() -> types.TaskDict:
    """Build the packages for all the distribution releases."""
    return {
        "actions": None,
        "task_dep": [
            "_build_redhat_7_packages",
            "_build_redhat_8_packages",
        ],
    }


def task__download_packages() -> types.TaskDict:
    """Download the packages for all the distribution releases."""
    return {
        "actions": None,
        "task_dep": [
            "_download_redhat_7_packages",
            "_download_redhat_8_packages",
        ],
    }


def task__build_repositories() -> types.TaskDict:
    """Build the repositories for all the distribution releases."""
    return {
        "actions": None,
        "task_dep": [
            "_build_redhat_7_repositories",
            "_build_redhat_8_repositories",
        ],
    }


def task__package_mkdir_root() -> types.TaskDict:
    """Create the packages root directory."""
    return targets.Mkdir(directory=constants.PKG_ROOT, task_dep=["_build_root"]).task


def task__package_mkdir_redhat_root() -> types.TaskDict:
    """Create the RedHat packages root directory."""
    return targets.Mkdir(
        directory=constants.PKG_REDHAT_ROOT,
        task_dep=["_package_mkdir_root"],
    ).task


def _package_mkdir_redhat_release_root(releasever: str) -> types.TaskDict:
    """Create the RedHat packages root directory for a given release."""
    return targets.Mkdir(
        directory=constants.PKG_REDHAT_ROOT / releasever,
        task_dep=["_package_mkdir_redhat_root"],
    ).task


def task__package_mkdir_redhat_7_root() -> types.TaskDict:
    """Create the RedHat 7 packages root directory."""
    return _package_mkdir_redhat_release_root("7")


def task__package_mkdir_redhat_8_root() -> types.TaskDict:
    """Create the RedHat 8 packages root directory."""
    return _package_mkdir_redhat_release_root("8")


def task__package_mkdir_iso_root() -> types.TaskDict:
    """Create the packages root directory on the ISO."""
    return targets.Mkdir(
        directory=constants.REPO_ROOT, task_dep=["_iso_mkdir_root"]
    ).task


def task__package_mkdir_redhat_iso_root() -> types.TaskDict:
    """Create the RedHat packages root directory on the ISO."""
    return targets.Mkdir(
        directory=constants.REPO_REDHAT_ROOT,
        task_dep=["_package_mkdir_iso_root"],
    ).task


def _package_mkdir_redhat_release_iso_root(releasever: str) -> types.TaskDict:
    """
    Create the RedHat packages root directory on the ISO for a given release.
    """
    return targets.Mkdir(
        directory=constants.REPO_REDHAT_ROOT / releasever,
        task_dep=["_package_mkdir_redhat_iso_root"],
    ).task


def task__package_mkdir_redhat_7_iso_root() -> types.TaskDict:
    """Create the RedHat 7 packages root directory on the ISO."""
    return _package_mkdir_redhat_release_iso_root("7")


def task__package_mkdir_redhat_8_iso_root() -> types.TaskDict:
    """Create the RedHat 8 packages root directory on the ISO."""
    return _package_mkdir_redhat_release_iso_root("8")


def _download_rpm_packages(releasever: str) -> types.TaskDict:
    """Download packages locally."""

    def clean() -> None:
        """Delete cache and repositories on the ISO."""
        coreutils.rm_rf(constants.PKG_REDHAT_ROOT / releasever / "var")
        for repository in REDHAT_REPOSITORIES[releasever]:
            # Repository with an explicit list of packages are created by a
            # dedicated task that will also handle their cleaning, so we skip
            # them here.
            if repository.packages:
                continue
            coreutils.rm_rf(repository.rootdir)

    mounts = [
        utils.bind_mount(
            source=constants.PKG_REDHAT_ROOT / releasever,
            target=Path("/install_root"),
        ),
        utils.bind_mount(
            source=constants.REPO_REDHAT_ROOT / releasever,
            target=Path("/repositories"),
        ),
    ]

    def _dl_packages_callable() -> None:
        # Compute list of all packages, using defined packages + requisites of
        # packages we build
        pkg_to_download = set(REDHAT_PACKAGES_TO_DOWNLOAD[releasever])
        for pkg_versions in RPM_TO_BUILD.values():
            for package in pkg_versions[releasever]:
                pkg_to_download |= package.requires

        docker_command.DockerRun(
            command=[
                "/entrypoint.sh",
                "download_packages",
                *pkg_to_download,
            ],
            builder=builder.RPM_BUILDER[releasever],
            mounts=mounts,
            environment={"RELEASEVER": releasever},
            run_config=docker_command.default_run_config(constants.REDHAT_ENTRYPOINT),
        )()

    return {
        "title": utils.title_with_target1("GET RPM PKGS"),
        "actions": [_dl_packages_callable],
        "targets": [constants.PKG_REDHAT_ROOT / releasever / "var"],
        "task_dep": [
            f"_package_mkdir_redhat_{releasever}_root",
            f"_package_mkdir_redhat_{releasever}_iso_root",
            f"_build_builder:{builder.RPM_BUILDER[releasever].name}",
            f"_build_redhat_{releasever}_packages",
        ],
        "clean": [clean],
        "uptodate": [doit.tools.config_changed(_TO_DOWNLOAD_RPM_CONFIG[releasever])],
        # Prevent Docker from polluting our output.
        "verbosity": 0,
    }


def task__download_redhat_7_packages() -> types.TaskDict:
    """Download RedHat 7 packages locally."""
    return _download_rpm_packages("7")


def task__download_redhat_8_packages() -> types.TaskDict:
    """Download RedHat 8 packages locally."""
    return _download_rpm_packages("8")


def _build_rpm_packages(releasever: str) -> Iterator[types.TaskDict]:
    """Build RPM packages."""
    for repo_pkgs in RPM_TO_BUILD.values():
        for package in repo_pkgs[releasever]:
            yield from package.execution_plan


def task__build_redhat_7_packages() -> Iterator[types.TaskDict]:
    """Build RPM packages for RedHat 7."""
    return _build_rpm_packages("7")


def task__build_redhat_8_packages() -> Iterator[types.TaskDict]:
    """Build RPM packages for RedHat 8."""
    return _build_rpm_packages("8")


def _build_redhat_repositories(releasever: str) -> Iterator[types.TaskDict]:
    """Build a RPM repository."""
    for repository in REDHAT_REPOSITORIES[releasever]:
        yield from repository.execution_plan


def task__build_redhat_7_repositories() -> Iterator[types.TaskDict]:
    """Build RedHat 7 repositories."""
    return _build_redhat_repositories("7")


def task__build_redhat_8_repositories() -> Iterator[types.TaskDict]:
    """Build RedHat 8 repositories."""
    return _build_redhat_repositories("8")


# }}}
# RPM packages and repository {{{

# Packages to build, per repository.
def _rpm_package(name: str, releasever: str, sources: List[Path]) -> targets.RPMPackage:
    try:
        pkg_info = versions.REDHAT_PACKAGES_MAP[releasever][name]
    except KeyError as exc:
        raise ValueError(
            'Missing version for package "{}" for release "{}"'.format(name, releasever)
        ) from exc

    # In case the `release` is of form "{build_id}.{os}", which is standard
    build_id_str, _, _ = pkg_info.release.partition(".")

    return targets.RPMPackage(
        basename="_build_redhat_{0}_packages".format(releasever),
        name=name,
        version=pkg_info.version,
        build_id=int(build_id_str),
        sources=sources,
        builder=builder.RPM_BUILDER[releasever],
        releasever=releasever,
        task_dep=[
            "_package_mkdir_redhat_{0}_root".format(releasever),
            "_build_builder:{}".format(builder.RPM_BUILDER[releasever].name),
        ],
    )


def _rpm_repository(
    name: str, releasever: str, packages: Optional[Sequence[targets.RPMPackage]] = None
) -> targets.RPMRepository:
    """Return a RPM repository object.

    Arguments:
        name:     repository name
        packages: list of locally built packages
    """
    mkdir_task = "_package_mkdir_redhat_{0}_iso_root".format(releasever)
    download_task = "_download_redhat_{0}_packages".format(releasever)
    return targets.RPMRepository(
        basename="_build_redhat_{0}_repositories".format(releasever),
        name=name,
        releasever=releasever,
        builder=builder.RPM_BUILDER[releasever],
        packages=packages,
        task_dep=[download_task if packages is None else mkdir_task],
    )


def _rpm_package_containerd(releasever: str) -> targets.RPMPackage:
    """Containerd RPM package."""
    extra_sources = []

    if releasever == "7":
        extra_sources.append(Path("60-containerd.conf"))

    return _rpm_package(
        name="containerd",
        releasever=releasever,
        sources=[
            Path("0001-Revert-commit-for-Windows-metrics.patch"),
            Path("containerd.service"),
            Path("containerd.toml"),
            Path("v{}.tar.gz".format(versions.CONTAINERD_VERSION)),
        ]
        + extra_sources,
    )


def _rpm_package_metalk8s_sosreport(releasever: str) -> targets.RPMPackage:
    """SOS report custom plugins RPM package."""
    return _rpm_package(
        name="metalk8s-sosreport",
        releasever=releasever,
        sources=[
            Path("metalk8s.py"),
            Path("metalk8s_containerd.py"),
        ],
    )


RPM_TO_BUILD: Dict[str, Dict[str, Tuple[targets.RPMPackage, ...]]] = {
    "scality": {
        "7": (
            _rpm_package_containerd("7"),
            _rpm_package_metalk8s_sosreport("7"),
        ),
        "8": (
            _rpm_package_containerd("8"),
            _rpm_package_metalk8s_sosreport("8"),
        ),
    },
}


_RPM_TO_BUILD_PKG_NAMES: Dict[str, List[str]] = _list_packages_to_build(RPM_TO_BUILD)

# All packages not referenced in `RPM_TO_BUILD` but listed in
# `versions.REDHAT_PACKAGES` are supposed to be downloaded.
REDHAT_PACKAGES_TO_DOWNLOAD: Dict[str, FrozenSet[str]] = {
    version: frozenset(
        package.rpm_full_name
        for package in pkgs
        if package.name not in _RPM_TO_BUILD_PKG_NAMES[version]
    )
    for version, pkgs in versions.REDHAT_PACKAGES.items()
}


# Store these versions in a dict to use with doit.tools.config_changed
_TO_DOWNLOAD_RPM_CONFIG: Dict[
    str, Dict[str, Optional[str]]
] = _list_packages_to_download(
    versions.REDHAT_PACKAGES,
    _RPM_TO_BUILD_PKG_NAMES,
)


SCALITY_REDHAT_7_REPOSITORY: targets.RPMRepository = _rpm_repository(
    name="scality", packages=RPM_TO_BUILD["scality"]["7"], releasever="7"
)
SCALITY_REDHAT_8_REPOSITORY: targets.RPMRepository = _rpm_repository(
    name="scality", packages=RPM_TO_BUILD["scality"]["8"], releasever="8"
)


REDHAT_REPOSITORIES: Dict[str, Tuple[targets.RPMRepository, ...]] = {
    "7": (
        SCALITY_REDHAT_7_REPOSITORY,
        _rpm_repository(name="epel", releasever="7"),
        _rpm_repository(name="kubernetes", releasever="7"),
        _rpm_repository(name="saltstack", releasever="7"),
    ),
    "8": (
        SCALITY_REDHAT_8_REPOSITORY,
        _rpm_repository(name="epel", releasever="8"),
        _rpm_repository(name="kubernetes", releasever="8"),
        _rpm_repository(name="saltstack", releasever="8"),
    ),
}

# }}}

__all__ = utils.export_only_tasks(__name__)
