# coding: utf-8


"""Base class for container images."""


import operator
from typing import Any
from pathlib import Path

from buildchain import constants
from buildchain import coreutils

from . import base


class ContainerImage(base.Target, base.AtomicTarget):
    """A container image."""
    def __init__(
        self,
        name: str,
        version: str,
        destination: Path,
        **kwargs: Any
    ):
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

    name     = property(operator.attrgetter('_name'))
    version  = property(operator.attrgetter('_version'))

    @property
    def dest_dir(self) -> Path:
        """Path to the destination directory."""
        return self._dest

    @property
    def dirname(self) -> Path:
        """Directory where to store the image on disk."""
        return self.dest_dir/self.tag.replace(':', '/')

    @property
    def tag(self) -> str:
        """Image tag."""
        return '{img.name}:{img.version}'.format(img=self)

    def show(self, command: str) -> str:
        """Return a description of the task."""
        return '{cmd: <{width}} {tag}'.format(
            cmd=command, width=constants.CMD_WIDTH, tag=self.tag
        )

    def mkdirs(self) -> None:
        """Create the image directory."""
        self.dirname.mkdir(parents=True, exist_ok=True)

    def clean(self) -> None:
        """Delete the image directory and its contents."""
        coreutils.rm_rf(self.dest_dir/self.name)
