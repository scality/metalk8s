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
        for_containerd: bool=False,
        **kwargs: Any
    ):
        """Initialize a container image.

        Arguments:
            name:           image name
            version:        image version
            destination:    save location for the image
            for_containerd: image will be loaded in containerd

        Keyword Arguments:
            Unused.
        """
        self._name = name
        self._version = version
        self._for_containerd = for_containerd
        self._dest = destination
        super().__init__(destination=self.filename, task_name=name, **kwargs)

    name           = property(operator.attrgetter('_name'))
    version        = property(operator.attrgetter('_version'))
    for_containerd = property(operator.attrgetter('_for_containerd'))
    dest_dir       = property(operator.attrgetter('_dest'))

    @property
    def filename(self) -> Path:
        """Name of the image on disk."""
        fileext = '.tar'
        if not self.for_containerd:
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
