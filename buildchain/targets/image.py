# coding: utf-8


"""Base class for container images."""


import operator
from typing import Any
from pathlib import Path

from . import base


# File extension used by compressed images.
COMPRESSED_FILEEXT = '.gz'


class ContainerImage(base.FileTarget):
    """A container image."""
    def __init__(
        self,
        name: str,
        version: str,
        destination: Path,
        is_compressed: bool=True,
        **kwargs: Any
    ):
        """Initialize a container image.

        Arguments:
            name:          image name
            version:       image version
            destination:   save location for the image
            is_compressed: compress the saved image?

        Keyword Arguments:
            Unused.
        """
        self._name = name
        self._version = version
        self._is_compressed = is_compressed
        self._dest = destination
        super().__init__(destination=self.filename, task_name=name, **kwargs)

    name          = property(operator.attrgetter('_name'))
    version       = property(operator.attrgetter('_version'))
    is_compressed = property(operator.attrgetter('_is_compressed'))
    dest_dir      = property(operator.attrgetter('_dest'))

    @property
    def filename(self) -> Path:
        """Name of the image on disk."""
        fileext = '.tar'
        if self.is_compressed:
            fileext += COMPRESSED_FILEEXT
        return self._dest/'{obj.name}-{obj.version}{ext}'.format(
            obj=self, ext=fileext
        )

    @property
    def uncompressed_filename(self) -> Path:
        """Name of the uncompressed image on disk."""
        filename = self.filename
        if filename.suffix == COMPRESSED_FILEEXT:
            return filename.with_suffix('')
        return filename

    @property
    def tag(self) -> str:
        """Image tag."""
        return '{img.name}:{img.version}'.format(img=self)
