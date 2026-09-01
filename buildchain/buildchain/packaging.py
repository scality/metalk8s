# coding: utf-8


"""Tasks to put repositories on the ISO.

This modules provides several services:
- build a unique container image for all the build tasks
- downloading packages and repositories
- downloading prebuilt packages attached to a GitHub release
- building local packages from sources
- building local repositories from local packages

Note that for now, it only works for Rocky/RedHat 8 and 9 x86_64.

Overview;

                                             (e.g.: base, …)
┌─────────┐               ┌──────────┐       ┌──────────────┐
│ builder │──────>│       │ download │       │    build     │
│  image  │       │──────>│ packages │──────>│ repositories │
└─────────┘       │       └──────────┘       └──────────────┘
                  │       ┌──────────┐       ┌──────────────┐
┌─────────┐       │──────>│  build   │──────>│    build     │
│  mkdir  │──────>│       │ packages │       │ repositories │
└─────────┘       │       └──────────┘       └──────────────┘
                  │     (e.g.: sosreport)     (e.g.: scality)
                  │       ┌──────────┐       ┌──────────────┐
                  │──────>│  fetch   │──────>│    build     │
                          │ packages │       │ repositories │
                          └──────────┘       └──────────────┘
              (e.g.: containerd-image-preload) (e.g.: scality)
"""

from pathlib import Path
from typing import (
    Callable,
    Dict,
    FrozenSet,
    Iterator,
    List,
    Mapping,
    Optional,
    Sequence,
    Tuple,
    Union,
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


PackageTarget = Union[targets.Package, targets.PrebuiltRPMPackage]


def _list_package_names(
    *pkg_cats: Mapping[str, Mapping[str, Tuple[PackageTarget, ...]]],
) -> Dict[str, List[str]]:
    names: Dict[str, List[str]] = {}
    for pkg_cat in pkg_cats:
        for pkg_versions in pkg_cat.values():
            for version, pkg_list in pkg_versions.items():
                names.setdefault(version, []).extend(pkg.name for pkg in pkg_list)
    return names


def _list_packages_to_download(
    package_versions: Dict[str, Tuple[versions.PackageVersion, ...]],
    local_packages: Dict[str, List[str]],
) -> Dict[str, Dict[str, Optional[str]]]:
    return {
        version: {
            pkg.name: pkg.full_version
            for pkg in pkgs
            if pkg.name not in local_packages[version]
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
            "_fetch_packages",
            "_build_packages",
            "_build_repositories",
        ],
    }


def task__build_packages() -> types.TaskDict:
    """Build the packages for all the distribution releases."""
    return {
        "actions": None,
        "task_dep": [
            "_build_redhat_8_packages",
            "_build_redhat_9_packages",
        ],
    }


def task__download_packages() -> types.TaskDict:
    """Download the packages for all the distribution releases."""
    return {
        "actions": None,
        "task_dep": [
            "_download_redhat_8_packages",
            "_download_redhat_9_packages",
        ],
    }


def task__fetch_packages() -> types.TaskDict:
    """Fetch the prebuilt packages for all the distribution releases."""
    return {
        "actions": None,
        "task_dep": [
            "_fetch_redhat_8_packages",
            "_fetch_redhat_9_packages",
        ],
    }


def task__build_repositories() -> types.TaskDict:
    """Build the repositories for all the distribution releases."""
    return {
        "actions": None,
        "task_dep": [
            "_build_redhat_8_repositories",
            "_build_redhat_9_repositories",
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


def task__package_mkdir_redhat_8_root() -> types.TaskDict:
    """Create the RedHat 8 packages root directory."""
    return _package_mkdir_redhat_release_root("8")


def task__package_mkdir_redhat_9_root() -> types.TaskDict:
    """Create the RedHat 9 packages root directory."""
    return _package_mkdir_redhat_release_root("9")


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


def task__package_mkdir_redhat_8_iso_root() -> types.TaskDict:
    """Create the RedHat 8 packages root directory on the ISO."""
    return _package_mkdir_redhat_release_iso_root("8")


def task__package_mkdir_redhat_9_iso_root() -> types.TaskDict:
    """Create the RedHat 9 packages root directory on the ISO."""
    return _package_mkdir_redhat_release_iso_root("9")


def _download_rpm_packages(releasever: str) -> types.TaskDict:
    """Download packages locally."""

    def clean() -> None:
        """Delete cache and repositories on the ISO."""
        coreutils.rm_rf(constants.PKG_REDHAT_ROOT / releasever / "var")
        for repository in REDHAT_REPOSITORIES[releasever]:
            # Repository with an explicit list of packages are created by a
            # dedicated task that will also handle their cleaning, so we skip
            # them here.
            if repository.has_local_packages:
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


def task__download_redhat_8_packages() -> types.TaskDict:
    """Download RedHat 8 packages locally."""
    return _download_rpm_packages("8")


def task__download_redhat_9_packages() -> types.TaskDict:
    """Download RedHat 9 packages locally."""
    return _download_rpm_packages("9")


def _fetch_rpm_packages(releasever: str) -> Iterator[types.TaskDict]:
    """Download the prebuilt RPM packages."""
    for repo_pkgs in RPM_TO_FETCH.values():
        for package in repo_pkgs[releasever]:
            yield package.task


def task__fetch_redhat_8_packages() -> Iterator[types.TaskDict]:
    """Download prebuilt RPM packages for RedHat 8."""
    return _fetch_rpm_packages("8")


def task__fetch_redhat_9_packages() -> Iterator[types.TaskDict]:
    """Download prebuilt RPM packages for RedHat 9."""
    return _fetch_rpm_packages("9")


def _build_rpm_packages(releasever: str) -> Iterator[types.TaskDict]:
    """Build RPM packages."""
    for repo_pkgs in RPM_TO_BUILD.values():
        for package in repo_pkgs[releasever]:
            yield from package.execution_plan


def task__build_redhat_8_packages() -> Iterator[types.TaskDict]:
    """Build RPM packages for RedHat 8."""
    return _build_rpm_packages("8")


def task__build_redhat_9_packages() -> Iterator[types.TaskDict]:
    """Build RPM packages for RedHat 9."""
    return _build_rpm_packages("9")


def _build_redhat_repositories(releasever: str) -> Iterator[types.TaskDict]:
    """Build a RPM repository."""
    for repository in REDHAT_REPOSITORIES[releasever]:
        yield from repository.execution_plan


def task__build_redhat_8_repositories() -> Iterator[types.TaskDict]:
    """Build RedHat 8 repositories."""
    return _build_redhat_repositories("8")


def task__build_redhat_9_repositories() -> Iterator[types.TaskDict]:
    """Build RedHat 9 repositories."""
    return _build_redhat_repositories("9")


# }}}
# RPM packages and repository {{{


# Packages to build, per repository.
def _rpm_package(name: str, releasever: str, sources: List[Path]) -> targets.RPMPackage:
    try:
        pkg_info = versions.REDHAT_PACKAGES_MAP[releasever][name]
    except KeyError as exc:
        raise ValueError(
            f'Missing version for package "{name}" for release "{releasever}"'
        ) from exc

    # In case the `release` is of form "{build_id}.{os}", which is standard
    build_id_str, _, _ = pkg_info.release.partition(".")

    return targets.RPMPackage(
        basename=f"_build_redhat_{releasever}_packages",
        name=name,
        version=pkg_info.version,
        build_id=int(build_id_str),
        sources=sources,
        builder=builder.RPM_BUILDER[releasever],
        releasever=releasever,
        task_dep=[
            f"_package_mkdir_redhat_{releasever}_root",
            f"_build_builder:{builder.RPM_BUILDER[releasever].name}",
        ],
    )


def _rpm_repository_basename(releasever: str) -> str:
    """Basename of the tasks building the repositories of a RedHat release."""
    return f"_build_redhat_{releasever}_repositories"


def _prebuilt_rpm_package(
    name: str,
    releasever: str,
    repo: str,
    source: str,
    tag: str,
    digest: str,
    arch: str,
) -> targets.PrebuiltRPMPackage:
    """Return a prebuilt RPM package object.

    Arguments:
        name:       package name
        releasever: RedHat release the package is built for
        repo:       name of the repository the package lands in
        source:     GitHub repository publishing the package
        tag:        tag of the release carrying the package
        digest:     expected SHA256 digest of the package
        arch:       package architecture
    """
    try:
        pkg_info = versions.REDHAT_PACKAGES_MAP[releasever][name]
    except KeyError as exc:
        raise ValueError(
            f'Missing version for package "{name}" for release "{releasever}"'
        ) from exc

    if not pkg_info.full_version:
        raise ValueError(
            f'Package "{name}" for release "{releasever}" needs a pinned version'
        )

    return targets.PrebuiltRPMPackage(
        basename=f"_fetch_redhat_{releasever}_packages",
        name=name,
        full_version=pkg_info.full_version,
        arch=arch,
        repository=source,
        tag=tag,
        digest=digest,
        destination_dir=targets.rpm_package_dir(repo, releasever),
        # The package lands in a directory the repository creates. Waiting for
        # it also settles the order `doit clean` walks the two in: it cleans a
        # task before the tasks it depends on, so the package leaves before
        # anyone tries to remove the directory holding it.
        task_dep=[
            f"{_rpm_repository_basename(releasever)}:"
            f"{repo}/{targets.MKDIR_ARCH_TASK_NAME}"
        ],
    )


def _rpm_repository(
    name: str,
    releasever: str,
    packages: Optional[Sequence[targets.RPMPackage]] = None,
    prebuilt_packages: Optional[Sequence[targets.PrebuiltRPMPackage]] = None,
) -> targets.RPMRepository:
    """Return a RPM repository object.

    Arguments:
        name:              repository name
        packages:          list of locally built packages
        prebuilt_packages: list of packages downloaded from a release
    """
    mkdir_task = f"_package_mkdir_redhat_{releasever}_iso_root"
    download_task = f"_download_redhat_{releasever}_packages"
    # A repository that holds packages of ours creates its own directories,
    # and waits for nothing else. The others come from the download task.
    local = targets.holds_local_packages(packages, prebuilt_packages)
    return targets.RPMRepository(
        basename=_rpm_repository_basename(releasever),
        name=name,
        releasever=releasever,
        builder=builder.RPM_BUILDER[releasever],
        packages=packages,
        prebuilt_packages=prebuilt_packages,
        task_dep=[mkdir_task if local else download_task],
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
        "8": (_rpm_package_metalk8s_sosreport("8"),),
        "9": (_rpm_package_metalk8s_sosreport("9"),),
    },
}


def _rpm_package_containerd_image_preload(
    repo: str, releasever: str
) -> targets.PrebuiltRPMPackage:
    """`containerd-image-preload` RPM, from the image-cache release.

    The package requires `containerd`, provided by the `containerd.io` package
    the ISO already carries, so nothing else has to be downloaded for it. A
    future version that needs more has to declare it in `versions.PACKAGES`:
    the availability check the Salt states run on every node resolves the
    dependencies of every declared package against the ISO repositories only.
    """
    try:
        digest = versions.IMAGE_CACHE_RPM_SHA256[releasever]
    except KeyError as exc:
        raise ValueError(
            f'Missing digest for the image-cache RPM for release "{releasever}"'
        ) from exc

    return _prebuilt_rpm_package(
        name="containerd-image-preload",
        releasever=releasever,
        repo=repo,
        source=versions.IMAGE_CACHE_REPOSITORY,
        tag=versions.IMAGE_CACHE_TAG,
        digest=digest,
        arch="noarch",
    )


def _packages_to_fetch(
    repo: str, *factories: Callable[[str, str], targets.PrebuiltRPMPackage]
) -> Dict[str, Dict[str, Tuple[targets.PrebuiltRPMPackage, ...]]]:
    """The packages one repository fetches, one entry per RedHat release.

    The repository is named once here: it is both the key the packages are
    declared under and the directory they land in, and a package that lands
    somewhere else than where it is declared never reaches the ISO.
    """
    return {
        repo: {
            releasever: tuple(factory(repo, releasever) for factory in factories)
            for releasever in versions.REDHAT_PACKAGES
        }
    }


# Packages to fetch from a release instead of building them, per repository.
RPM_TO_FETCH: Dict[str, Dict[str, Tuple[targets.PrebuiltRPMPackage, ...]]] = (
    _packages_to_fetch("scality", _rpm_package_containerd_image_preload)
)


# Packages the build provides on its own, whether it builds them or downloads
# them from a release: `dnf` must not try to get them from a repository.
_LOCAL_RPM_PKG_NAMES: Dict[str, List[str]] = _list_package_names(
    RPM_TO_BUILD, RPM_TO_FETCH
)

# All packages not referenced in `RPM_TO_BUILD` nor in `RPM_TO_FETCH` but listed
# in `versions.REDHAT_PACKAGES` are supposed to be downloaded.
REDHAT_PACKAGES_TO_DOWNLOAD: Dict[str, FrozenSet[str]] = {
    version: frozenset(
        package.rpm_full_name
        for package in pkgs
        if package.name not in _LOCAL_RPM_PKG_NAMES[version]
    )
    for version, pkgs in versions.REDHAT_PACKAGES.items()
}


# Store these versions in a dict to use with doit.tools.config_changed
_TO_DOWNLOAD_RPM_CONFIG: Dict[str, Dict[str, Optional[str]]] = (
    _list_packages_to_download(
        versions.REDHAT_PACKAGES,
        _LOCAL_RPM_PKG_NAMES,
    )
)


SCALITY_REDHAT_8_REPOSITORY: targets.RPMRepository = _rpm_repository(
    name="scality",
    packages=RPM_TO_BUILD["scality"]["8"],
    prebuilt_packages=RPM_TO_FETCH["scality"]["8"],
    releasever="8",
)
SCALITY_REDHAT_9_REPOSITORY: targets.RPMRepository = _rpm_repository(
    name="scality",
    packages=RPM_TO_BUILD["scality"]["9"],
    prebuilt_packages=RPM_TO_FETCH["scality"]["9"],
    releasever="9",
)


REDHAT_REPOSITORIES: Dict[str, Tuple[targets.RPMRepository, ...]] = {
    "8": (
        SCALITY_REDHAT_8_REPOSITORY,
        _rpm_repository(name="epel", releasever="8"),
        _rpm_repository(name="kubernetes", releasever="8"),
        _rpm_repository(name="saltstack", releasever="8"),
        _rpm_repository(name="docker-ce", releasever="8"),
    ),
    "9": (
        SCALITY_REDHAT_9_REPOSITORY,
        _rpm_repository(name="epel", releasever="9"),
        _rpm_repository(name="kubernetes", releasever="9"),
        _rpm_repository(name="saltstack", releasever="9"),
        _rpm_repository(name="docker-ce", releasever="9"),
    ),
}

# }}}

__all__ = utils.export_only_tasks(__name__)
