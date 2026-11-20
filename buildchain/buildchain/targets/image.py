# coding: utf-8


"""Base class for container images."""

import abc
import operator
from typing import Any
from pathlib import Path

from buildchain import constants
from buildchain import coreutils

from . import base


class ContainerImage(base.AtomicTarget):
    """A container image."""

    def __init__(self, name: str, version: str, destination: Path, **kwargs: Any):
        """Initialize a container image.

        Arguments:
            name:           image name
            version:        image version
            destination:    save location for the image

        Keyword Arguments:
            Unused.
        """
        self._name = name
        self._version = version
        self._dest = destination
        super().__init__(task_name=name, **kwargs)

    name = property(operator.attrgetter("_name"))
    version = property(operator.attrgetter("_version"))

    @property
    def dest_dir(self) -> Path:
        """Path to the destination directory."""
        return self._dest

    @property
    def dirname(self) -> Path:
        """Directory where to store the image on disk."""
        return self.dest_dir.joinpath(self.name, self.version)

    @property
    @abc.abstractmethod
    def layout_dirname(self) -> Path:
        """Directory of the image OCI layout.

        It is named after the image full name, registry host included: the name
        static-oci-registry looks the image up by.
        """

    @property
    def tag(self) -> str:
        """Image tag."""
        return f"{self.name}:{self.version}"

    def show(self, command: str) -> str:
        """Return a description of the task."""
        return f"{command: <{constants.CMD_WIDTH}} {self.tag}"

    def mkdirs(self) -> None:
        """Create the image directory."""
        self.dirname.mkdir(parents=True, exist_ok=True)

    def clean(self) -> None:
        """Delete the image directory and its contents."""
        coreutils.rm_rf(self.dest_dir / self.name)

    def prepare_layout(self) -> None:
        """Make room for skopeo to write the OCI layout.

        skopeo adds to an existing layout, which would ship the previous
        version along, and fails if the parent directory does not exist.
        """
        coreutils.rm_rf(self.layout_dirname)
        self.layout_dirname.parent.mkdir(parents=True, exist_ok=True)

    def clean_layout(self) -> None:
        """Delete the OCI layout, and the parent directories it leaves empty."""
        coreutils.rm_rf(self.layout_dirname)
        directory = self.layout_dirname.parent
        while (
            directory != self.dest_dir
            and directory.is_dir()
            and not any(directory.iterdir())
        ):
            directory.rmdir()
            directory = directory.parent
