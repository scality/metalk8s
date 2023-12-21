# coding: utf-8


"""Provides local packages construction.

This modules provides several services:
- create the directory for the packages
- generate the .meta from the .spec
- download the source files
- build a SRPM from the source files

Note that for now, it only works for CentOS 7 x86_64.

            self.make_package_directory(),
            self.generate_meta(),
            self.get_source_files(),
            self.build_srpm(),

Overview;

┌─────┐     ┌───────────────┐     ┌────────────────┐     ┌────────────┐
│mkdir│────>│ generate .meta│────>│ download source│────>│ build SRPM │
└─────┘     └───────────────┘     └────────────────┘     └────────────┘
"""


import os
import operator
import re
import shutil
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, FrozenSet, List, Sequence

from buildchain import constants
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
    """A RPM software package for CentOS."""

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
            raise Exception(f"URL not found for source files: {', '.join(sourcefiles)}")
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


def _file_from_url(url: str) -> str:
    """Get filename from a URL."""
    path = urllib.parse.urlparse(url).path
    return urllib.parse.unquote(os.path.basename(path))
