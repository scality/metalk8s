# coding: utf-8


"""Provides container image retrieval.

The images are downloaded from a repository.
Then, they are tagged, saved on the disk and optionally compressed.

All of these actions are done by a single task.
"""


import operator
from pathlib import Path
from typing import Any, Optional, List

from buildchain import docker_command
from buildchain import config
from buildchain import types

from . import image


class RemoteImage(image.ContainerImage):
    """A remote container image to download."""

    def __init__(
        self,
        repository: str,
        name: str,
        version: str,
        digest: str,
        destination: Path,
        save_as_tar: bool=False,
        remote_name: Optional[str]=None,
        **kwargs: Any
    ):
        """Initialize a remote container image.

        Arguments:
            repository:     repository where the image is stored
            name:           image name
            version:        image version
            digest:         image digest
            destination:    save location for the image
            save_as_tar:    save the image as a tar archive?
            remote_name:    image name in the registry

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        self._repository = repository
        self._digest = digest
        self._remote_name = remote_name or name
        self._use_tar = save_as_tar
        kwargs.setdefault('task_dep', []).append('check_for:skopeo')
        super().__init__(
            name=name, version=version,
            destination=destination,
            **kwargs
        )
        self._targets = [self.filepath]

    repository = property(operator.attrgetter('_repository'))
    digest   = property(operator.attrgetter('_digest'))

    @property
    def remote_fullname(self) -> str:
        """Complete image name retrieved from the remote repository."""
        return (
            "{img.repository}/{img._remote_name}:{img.version}"
        ).format(img=self)

    @property
    def fullname(self) -> str:
        """Complete image name to use as a tag before saving with Docker."""
        return "{img.repository}/{img.tag}".format(img=self)


    @property
    def filepath(self) -> Path:
        """Path to the file tracked on disk."""
        if self._use_tar:
            return self.dest_dir/'{img.name}-{img.version}{ext}'.format(
                img=self, ext='.tar'
            )
        # Just to keep track of something on disk.
        return self.dirname/'manifest.json'

    @property
    def task(self) -> types.TaskDict:
        task = self.basic_task
        task.update({
            'title': lambda _: self.show('PULL IMG'),
            'doc': 'Download {} container image.'.format(self.name),
            'uptodate': [True],
        })

        if self._use_tar:
            # Use Docker to pull, tag, then save the image
            task['actions'] = [
                docker_command.DockerPull(
                    self.repository,
                    self._remote_name,
                    self.version,
                    self.digest,
                ),
                docker_command.DockerTag(
                    '{img.repository}/{img.name}'.format(img=self),
                    self.remote_fullname,
                    self.version,
                ),
                docker_command.DockerSave(
                    self.fullname,
                    self.filepath,
                )
            ]
        else:
            # Use Skopeo to directly copy the remote image into a directory
            # of image layers
            task.update({
                'actions': [self.mkdirs, self._skopeo_copy()],
                'clean':   [self.clean],
            })

        return task

    def _skopeo_copy(self) -> List[str]:
        """Return the command line to execute skopeo copy."""
        cmd = [
            config.ExtCommand.SKOPEO.value, '--override-os', 'linux',
            '--insecure-policy', 'copy', '--format', 'v2s2'
        ]
        cmd.append('docker://{}'.format(self.remote_fullname))
        cmd.append('dir:{}'.format(self.dirname))
        return cmd
