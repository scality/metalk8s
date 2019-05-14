# coding: utf-8


"""Provides container image retrieval.

The images are downloaded from a registry.
Then, they are tagged, saved on the disk and optionally compressed.

All of these actions are done by a single task.
"""


import operator
from pathlib import Path
from typing import Any, Optional, List

from buildchain import docker_command
from buildchain import config
from buildchain import types

from . import base, image


class RemoteImage(image.ContainerImage):
    """A remote container image to download."""

    def __init__(
        self,
        registry: str,
        name: str,
        version: str,
        digest: str,
        destination: Path,
        remote_name: Optional[str]=None,
        **kwargs: Any
    ):
        """Initialize a remote container image.

        Arguments:
            registry:       registry where the image is
            name:           image name
            version:        image version
            digest:         image digest
            destination:    save location for the image
            remote_name:    image name in the registry

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        self._registry = registry
        self._digest = digest
        self._remote_name = remote_name or name
        super().__init__(
            name=name, version=version,
            destination=destination,
            **kwargs
        )

    registry = property(operator.attrgetter('_registry'))
    digest   = property(operator.attrgetter('_digest'))

    @property
    def fullname(self) -> str:
        """Complete image name.

        Usable by `docker` commands.
        """
        return '{obj.registry}/{obj._remote_name}@{obj.digest}'.format(
            obj=self
        )

    @property
    def task(self) -> types.TaskDict:
        task = self.basic_task
        task.update({
            'title': lambda _: self.show('PULL IMG'),
            'doc': 'Download {} container image.'.format(self.name),
            'targets': [self.dirname/'manifest.json'],
            'actions': self._build_actions(),
            'uptodate': [True],
            'clean': [self.clean],
        })
        return task

    def _build_actions(self) -> List[types.Action]:
        return [
            self.mkdirs,
            [
                config.SKOPEO, 'copy',
                '--format', 'v2s2',
                '--dest-compress',
                'docker://{}'.format(self.fullname),
                'dir:{}'.format(str(self.dirname))
            ]
        ]


class RemoteTarImage(base.FileTarget):
    """A remote container image to download, saved as a tar archive.

    The image is saved as a single tar archive, not compressed and with a tag
    usable by containerd.
    """

    def __init__(
        self,
        registry: str,
        name: str,
        version: str,
        digest: str,
        destination: Path,
        remote_name: Optional[str]=None,
        **kwargs: Any
    ):
        """Initialize the container image.

            Arguments:
                They are passed to `RemoteImage` init methods.

            Keyword Arguments:
                They are passed to `RemoteImage` and `FileTarget` init methods.
        """
        self._image = RemoteImage(
            registry, name, version, digest, destination, remote_name, **kwargs
        )
        super().__init__(destination=self.filepath, **kwargs)

    @property
    def repository(self) -> str:
        """Image repository."""
        return '{obj.registry}/{obj._remote_name}'.format(obj=self._image)

    @property
    def filepath(self) -> Path:
        """Name of the image on disk."""
        return self._image.dest_dir/'{obj.name}-{obj.version}{ext}'.format(
            obj=self._image, ext='.tar'
        )

    @property
    def task(self) -> types.TaskDict:
        basic_task = self.basic_task
        task = self._image.task
        task.update({
            'actions': self._build_actions(),
            'targets': basic_task['targets'],
            'clean':   basic_task['clean'],
        })
        return task

    def _build_actions(self) -> List[types.Action]:
        """Compute actions for the image — pull, tag, save."""
        tag = '{img.registry}/{img.name}:{img.version}'.format(img=self._image)
        docker_pull = docker_command.DockerPull(
            repository=self.repository, digest=self._image.digest
        )
        docker_tag = docker_command.DockerTag(
            # The local repository is the image 'tag' without version
            repository=tag[:tag.rfind(':')],
            full_name=self._image.fullname,
            version=self._image.version
        )
        docker_save = docker_command.DockerSave(
            tag=tag, save_path=self.filepath
        )
        return [docker_pull, docker_tag, docker_save]
