# coding: utf-8


"""Provides local packages construction.

This modules provides several services:
- create the directory for the packages
- generate the .meta from the .spec
- download the source files
- build a SRPM from the source files
- download a prebuilt RPM attached to a GitHub release

Note that for now, it only works for Rocky/RedHat 8 and 9 x86_64.

Overview;

┌─────┐     ┌───────────────┐     ┌────────────────┐     ┌────────────┐
│mkdir│────>│ generate .meta│────>│ download source│────>│ build SRPM │
└─────┘     └───────────────┘     └────────────────┘     └────────────┘

                            ┌──────────────────┐
                            │ download prebuilt│
                            │  RPM from release│
                            └──────────────────┘
"""

import functools
import hashlib
import http.client
import os
import operator
import re
import shutil
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, FrozenSet, Iterator, List, Sequence

from buildchain import constants
from buildchain import coreutils
from buildchain import types
from buildchain import utils
from buildchain import docker_command

from . import base
from . import directory
from . import image


class Package(base.CompositeTarget):
    """Base class to build a software package."""

    MKDIR_TASK_NAME = "mkdir"

    def __init__(
        self,
        basename: str,
        name: str,
        version: str,
        build_id: int,
        builder: image.ContainerImage,
        pkg_root: Path,
        releasever: str,
        **kwargs: Any,
    ):
        self._name = name
        self._version = version
        self._build_id = build_id
        self._builder = builder
        self._pkg_root = pkg_root
        self._releasever = releasever
        super().__init__(basename=basename, **kwargs)

    name = property(operator.attrgetter("_name"))
    version = property(operator.attrgetter("_version"))
    build_id = property(operator.attrgetter("_build_id"))
    builder = property(operator.attrgetter("_builder"))

    def _get_task_name(self, taskname: str, with_basename: bool = False) -> str:
        """Return a fully qualified task name.

        The task name is prefixed by the package name.
        Use the given basename if any.
        """
        prefix = f"{self.basename}:" if with_basename else ""
        return f"{prefix}{self.name}/{taskname}"


class RPMPackage(Package):
    """A RPM software package for Rocky/RedHat."""

    SOURCE_URL_PATTERN = re.compile(r"^(Source|Patch)\d+:\s+(?P<url>.+)$")

    def __init__(
        self,
        basename: str,
        name: str,
        version: str,
        build_id: int,
        sources: Sequence[Path],
        builder: image.ContainerImage,
        releasever: str,
        **kwargs: Any,
    ):
        """Initialize the package.

        Arguments:
            basename: basename for the sub-tasks
            name:     package name
            version:  package version
            build_id: package build ID
            sources:  package source files
            builder:  docker image used to build the package

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        super().__init__(
            basename,
            name,
            version,
            build_id,
            builder,
            constants.PKG_REDHAT_ROOT,
            releasever,
            **kwargs,
        )
        self._sources = [self.rootdir / "SOURCES" / filename for filename in sources]

    sources = property(operator.attrgetter("_sources"))

    @property
    def rootdir(self) -> Path:
        """Package root directory."""
        return self._pkg_root / self._releasever / self._name

    @property
    def srcdir(self) -> Path:
        """Package source directory."""
        return self.rootdir / "SOURCES"

    @property
    def spec(self) -> Path:
        """.spec file path."""
        return constants.ROOT / "packages" / "redhat" / "common" / f"{self.name}.spec"

    @property
    def meta(self) -> Path:
        """.meta file path."""
        return self.rootdir / f"{self.name}.meta"

    @property
    def requires_file(self) -> Path:
        """requires list file path."""
        return self.rootdir / "requires.txt"

    @property
    def requires(self) -> FrozenSet[str]:
        """requires list frozen set"""
        return frozenset(self.requires_file.read_text().splitlines())

    @property
    def srpm(self) -> Path:
        """SRPM path."""
        return (
            constants.PKG_REDHAT_ROOT
            / self._releasever
            / f"{self.name}-{self.version}-{self.build_id}.el{self._releasever}.src.rpm"
        )

    @property
    def execution_plan(self) -> List[types.TaskDict]:
        return [
            self.make_package_directory(),
            self.generate_meta(),
            self.get_source_files(),
            self.build_srpm(),
        ]

    def make_package_directory(self) -> types.TaskDict:
        """Create the package's directory."""
        task = self.basic_task
        mkdir = directory.Mkdir(directory=self.rootdir).task
        task.update(
            {
                "name": self._get_task_name(self.MKDIR_TASK_NAME),
                "doc": f"Create directory for {self.name}.",
                "title": mkdir["title"],
                "actions": mkdir["actions"],
                "uptodate": mkdir["uptodate"],
                "targets": mkdir["targets"],
            }
        )
        return task

    def generate_meta(self) -> types.TaskDict:
        """Generate the .meta file for the package."""
        spec_guest_file = Path("/rpmbuild/SPECS", self.spec.name)
        meta_guest_file = Path("/rpmbuild/META", self.meta.name)
        mounts = [
            utils.bind_ro_mount(source=self.spec, target=spec_guest_file),
            utils.bind_mount(source=self.meta.parent, target=meta_guest_file.parent),
        ]
        rpmspec_config = docker_command.default_run_config(constants.REDHAT_ENTRYPOINT)
        rpmspec_config["read_only"] = True
        buildmeta_callable = docker_command.DockerRun(
            command=["/entrypoint.sh", "buildmeta"],
            builder=self.builder,
            environment={"SPEC": self.spec.name, "META": self.meta.name},
            run_config=rpmspec_config,
            mounts=mounts,
        )
        task = self.basic_task
        task.update(
            {
                "name": self._get_task_name("rpmspec"),
                "actions": [buildmeta_callable],
                "doc": f"Generate {self.name}.meta",
                "title": utils.title_with_target1("RPMSPEC"),
                "targets": [self.meta, self.requires_file],
            }
        )
        task["file_dep"].extend([self.spec])
        task["task_dep"].append(
            self._get_task_name(self.MKDIR_TASK_NAME, with_basename=True)
        )
        return task

    def get_source_files(self) -> types.TaskDict:
        """Download the source files to build the package."""
        targets = [self.srcdir]
        targets.extend(self.sources)
        actions = directory.Mkdir(directory=self.srcdir).task["actions"]
        actions.append(self._get_sources)
        task = self.basic_task
        task.update(
            {
                "name": self._get_task_name("get_source"),
                "actions": actions,
                "doc": f"Download source files for {self.name}.",
                "title": utils.title_with_target1("GET_SRC"),
                "targets": targets,
            }
        )
        task["file_dep"].append(self.meta)
        task["task_dep"].append(
            self._get_task_name(self.MKDIR_TASK_NAME, with_basename=True)
        )
        return task

    def build_srpm(self) -> types.TaskDict:
        """Build the SRPM for the package."""
        env = {
            "SPEC": self.spec.name,
            "SRPM": self.srpm.name,
            "SOURCES": " ".join(source.name for source in self.sources),
            "VERSION": self.version,
        }
        buildsrpm_callable = docker_command.DockerRun(
            command=["/entrypoint.sh", "buildsrpm"],
            builder=self.builder,
            environment=env,
            tmpfs={"/home/build": "", "/var/tmp": ""},
            mounts=self._get_buildsrpm_mounts(self.srpm.parent),
            read_only=True,
            run_config=docker_command.default_run_config(constants.REDHAT_ENTRYPOINT),
        )

        task = self.basic_task
        task.update(
            {
                "name": self._get_task_name("srpm"),
                "actions": [buildsrpm_callable],
                "doc": f"Build {self.srpm.name}",
                "title": utils.title_with_target1("BUILD SRPM"),
                "targets": [self.srpm],
                # Prevent Docker from polluting our output.
                "verbosity": 0,
            }
        )
        task["file_dep"].extend([self.spec])
        task["file_dep"].extend(self.sources)
        task["task_dep"].append(
            self._get_task_name(self.MKDIR_TASK_NAME, with_basename=True)
        )
        return task

    def _get_sources(self) -> None:
        """Gather the package resources."""
        for srcfile, url in self._get_source_files_urls().items():
            if urllib.parse.urlparse(url).scheme:
                with urllib.request.urlopen(url) as conn:
                    with open(srcfile, "wb") as fp:
                        fp.write(conn.read())
            else:
                url = os.path.join(
                    constants.ROOT / "packages" / "redhat" / "common", url
                )
                shutil.copyfile(url, srcfile)

    def _get_source_files_urls(self) -> Dict[Path, str]:
        """Extract source file URLs from .meta file."""
        urls = {}
        sourcefiles = {src.name for src in self.sources}
        with open(self.meta, "r", encoding="utf-8") as fp:
            for line in fp:
                match = self.SOURCE_URL_PATTERN.match(line)
                if not match:
                    continue
                url = match.group("url")
                filename = _file_from_url(url)
                if filename in sourcefiles:
                    sourcefiles.remove(filename)
                    urls[self.srcdir / filename] = url
        if sourcefiles:
            raise ValueError(
                f"URL not found for source files: {', '.join(sourcefiles)}"
            )
        return urls

    def _get_buildsrpm_mounts(self, srpm_dir: Path) -> List[types.Mount]:
        """Return the list of container mounts required by `buildsrpm`."""
        mounts = [
            # .spec file
            utils.bind_ro_mount(
                source=self.spec, target=Path("/rpmbuild/SPECS", self.spec.name)
            ),
            # SRPM directory.
            utils.bind_mount(
                source=srpm_dir,
                target=Path("/rpmbuild/SRPMS"),
            ),
            # rpmlint configuration file
            docker_command.RPMLINTRC_MOUNT,
        ]

        # Source files.
        for source in self.sources:
            mounts.append(
                utils.bind_ro_mount(
                    source=source, target=Path("/rpmbuild/SOURCES", source.name)
                )
            )
        return mounts


class PrebuiltRPMPackage(base.AtomicTarget):
    """A RPM built elsewhere and attached to a GitHub release.

    Nothing is built here, unlike `RPMPackage`: the release carries one RPM per
    RedHat release, and we only download the one we pinned and check it against
    its expected digest before it lands in a repository.

    A GitHub release is the only source this reads, since it is the only one we
    publish to. What is tied to GitHub is the URL and the name the release
    serves the asset under, so another source means a second way to turn a
    declaration into a URL. The digest check, the atomic write, the up-to-date
    check and the cleanup have nothing to do with GitHub and would be shared.
    """

    GITHUB_RELEASES_URL = "https://github.com"
    DOWNLOAD_TIMEOUT = 60
    DIGEST_PATTERN = re.compile(r"[0-9a-f]{64}")
    PARTIAL_SUFFIX = ".part"
    # GitHub names an asset after the file that was uploaded, with every
    # character outside this set replaced by a dot. A prerelease tag builds an
    # RPM whose version holds a tilde (`0.1.0~alpha.1`), and the release serves
    # it as `0.1.0.alpha.1` while the package itself keeps its real name.
    ASSET_FORBIDDEN_PATTERN = re.compile(r"[^A-Za-z0-9._-]")
    # `name-version-release.arch.rpm`, where neither version nor release can
    # hold a hyphen: that is what tells another version of this package from
    # another package whose name starts the same way.
    VERSION_PATTERN = r"-[^-]+-[^-]+\.[^.]+\.rpm"

    def __init__(
        self,
        basename: str,
        name: str,
        full_version: str,
        arch: str,
        repository: str,
        tag: str,
        digest: str,
        destination_dir: Path,
        **kwargs: Any,
    ):
        """Initialize the package.

        Arguments:
            basename:        basename for the sub-task
            name:            package name
            full_version:    package version and release, e.g. `1.0.0-1.el8`
            arch:            package architecture
            repository:      GitHub repository publishing the package
            tag:             tag of the release carrying the package
            digest:          expected SHA256 digest of the package
            destination_dir: directory where the package is downloaded

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        self._name = name
        self._repository = repository
        self._tag = tag
        self._digest = digest
        self._path = destination_dir / f"{name}-{full_version}.{arch}.rpm"
        kwargs["targets"] = [self._path]
        super().__init__(basename=basename, **kwargs)

    name = property(operator.attrgetter("_name"))
    path = property(operator.attrgetter("_path"))

    @property
    def release(self) -> str:
        """The release the package comes from, as a reader would name it."""
        return f"{self._repository} {self._tag}"

    @property
    def asset_name(self) -> str:
        """Name the release gives the package, which is not its filename."""
        return self.ASSET_FORBIDDEN_PATTERN.sub(".", self._path.name)

    @property
    def url(self) -> str:
        """URL of the package inside its release."""
        return (
            f"{self.GITHUB_RELEASES_URL}/{self._repository}/releases/download/"
            f"{self._tag}/{self.asset_name}"
        )

    @property
    def task(self) -> types.TaskDict:
        task = self.basic_task
        task.update(
            {
                "name": self._name,
                "actions": [self._download],
                "doc": f"Download {self._path.name} from {self.release}.",
                "title": utils.title_with_target1("GET RPM"),
            }
        )
        # Without an up-to-date check, doit sees a task with no dependency,
        # considers it never up to date, and downloads the package again on
        # every build, network access or not.
        task["uptodate"].append(self.is_up_to_date)
        return task

    def is_up_to_date(self) -> bool:
        """Whether the pinned package is alone in place, and intact.

        Hashing the file instead of remembering the pin also catches a package
        truncated by an interrupted build. A leftover from another pin makes
        the task run again: the cleanup only happens on download, and the
        repository metadata would otherwise index both versions.
        """
        if not self._path.is_file():
            return False
        if any(self._leftovers()):
            return False
        try:
            return self._file_digest() == self.digest
        except ValueError:
            return False

    @property
    def digest(self) -> str:
        """The pinned digest, as `hexdigest` writes it."""
        digest = self._digest.strip().lower().removeprefix("sha256:")
        if not digest:
            raise ValueError(
                f"No SHA256 digest pinned for {self._path.name}: add it to "
                f"`versions.py` for the {self.release} release."
            )
        if not self.DIGEST_PATTERN.fullmatch(digest):
            raise ValueError(
                f"Pinned digest of {self._path.name} is not a SHA256 digest: "
                f"{self._digest!r}."
            )
        return digest

    def _file_digest(self) -> str:
        """Digest of the package sitting at the target path."""
        return coreutils.sha256_of(self._path)

    def _download(self) -> None:
        """Download the package, and keep it only if its digest matches."""
        try:
            expected = self.digest
        except ValueError as error:
            raise RuntimeError(str(error)) from error

        # No file is kept unless the package is known to be good: a failed
        # download leaves nothing but, once the response is open, the empty
        # directory it wrote into.
        partial = self._path.with_name(f".{self._path.name}{self.PARTIAL_SUFFIX}")
        try:
            digest = self._stream_to(partial)
            if digest != expected:
                raise RuntimeError(
                    f"Wrong digest for {self._path.name} from {self.release}: "
                    f"expected {expected}, got {digest}."
                )
            os.replace(partial, self._path)
        finally:
            partial.unlink(missing_ok=True)
        # Once the package is in place, and not before: the repository must
        # never hold zero version of it.
        self._remove_leftovers()

    def _stream_to(self, partial: Path) -> str:
        """Download the package next to its target, and return its digest."""
        hasher = hashlib.sha256()
        try:
            with urllib.request.urlopen(
                self.url, timeout=self.DOWNLOAD_TIMEOUT
            ) as response:
                # The repository creates this directory, and the task waits
                # for it. Creating it here too lets the task run on its own,
                # as `./doit.sh _fetch_redhat_8_packages` and the tests do.
                partial.parent.mkdir(parents=True, exist_ok=True)
                with partial.open("wb") as fp:
                    for chunk in iter(
                        functools.partial(response.read, coreutils.BUFSIZE), b""
                    ):
                        hasher.update(chunk)
                        fp.write(chunk)
        except urllib.error.HTTPError as error:
            raise RuntimeError(
                f"Failed to download {self._path.name} from {self.url}: "
                f"HTTP {error.code}. Check that {self.release} exists and "
                f"carries this package."
            ) from error
        # A connection that drops mid-read raises neither `HTTPError` nor
        # `URLError`, and the build deserves the same message.
        except (OSError, http.client.HTTPException) as error:
            raise RuntimeError(
                f"Failed to download {self._path.name} from {self.url}: "
                f"{error}. Check that {self.release} exists and carries "
                f"this package."
            ) from error
        return hasher.hexdigest()

    def _leftovers(self) -> Iterator[Path]:
        """This package under another pin, and partials of any pin.

        The repository directory ends up on the ISO as it is, and its metadata
        indexes every RPM found there, so an older version of this package
        would ship next to the pinned one. A package whose name merely starts
        the same way, `containerd-image-preload-extras` here, belongs to
        another task and is left alone.
        """
        name = re.escape(self._name)
        package_pattern = re.compile(name + self.VERSION_PATTERN)
        partial_pattern = re.compile(
            rf"\.{name}{self.VERSION_PATTERN}{re.escape(self.PARTIAL_SUFFIX)}"
        )
        for candidate in self._path.parent.glob(f"*{self._name}-*"):
            if candidate == self._path:
                continue
            if package_pattern.fullmatch(candidate.name) or partial_pattern.fullmatch(
                candidate.name
            ):
                yield candidate

    def _remove_leftovers(self) -> None:
        """Drop what a previous pin, or an interrupted build, left in place."""
        for leftover in self._leftovers():
            leftover.unlink()


def _file_from_url(url: str) -> str:
    """Get filename from a URL."""
    path = urllib.parse.urlparse(url).path
    return urllib.parse.unquote(os.path.basename(path))
