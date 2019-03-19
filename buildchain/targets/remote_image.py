# coding: utf-8


"""Provides container image retrieval.

The images are downloaded from a registry.
Then, they are tagged, saved on the disk and optionally compressed.

All of these actions are done by a single task.
"""


import operator
from pathlib import Path
from typing import Any, Optional, List

import doit  # type: ignore

from buildchain import config
from buildchain import coreutils
from buildchain import types
from buildchain import utils

from . import image


class RemoteImage(image.ContainerImage):
    """A remote container image to download."""

    def __init__(
        self,
        registry: str,
        name: str,
        version: str,
        digest: str,
        is_compressed: bool,
        destination: Path,
        remote_name: Optional[str]=None,
        **kwargs: Any
    ):
        """Initialize a remote container image.

        Arguments:
            registry:      registry where the image is
            name:          image name
            version:       image version
            digest:        image digest
            is_compressed: compress the saved image?
            destination:   save location for the image
            remote_name:   image name in the registry

        Keyword Arguments:
            They are passed to `FileTarget` init method.
        """
        self._registry = registry
        self._digest = digest
        self._remote_name = remote_name or name
        super().__init__(
            name=name, version=version,
            destination=destination,
            is_compressed=is_compressed,
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
            'title': self._show,
            'doc': 'Download {} container image.'.format(self.name),
            'actions': self._build_actions(),
            'uptodate': [doit.tools.run_once],
        })
        return task

    @staticmethod
    def _show(task: types.Task) -> str:
        """Return a description of the task."""
        return utils.title_with_target1('IMG PULL', task)

    def _build_actions(self) -> List[types.Action]:
        filepath = self.uncompressed_filename
        actions : List[types.Action] = [
            [config.DOCKER, 'pull', self.fullname],
            [config.DOCKER, 'tag', self.fullname, self.tag],
            [config.DOCKER, 'save', self.tag, '-o', str(filepath)],
        ]
        if self.is_compressed:
            actions.append((coreutils.gzip, [filepath], {}))
        return actions
