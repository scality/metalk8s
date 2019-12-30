# coding: utf-8


"""Provides operations on directories."""


from os import umask
from pathlib import Path
from typing import Any, Optional

from buildchain import types
from buildchain import utils

from . import base


class Mkdir(base.AtomicTarget):
    """Create a directory."""

    def __init__(self, directory: Path, user_mask: Optional[int] = None,
                 **kwargs: Any):
        """Initialize with the target directory.

        Arguments:
            directory: path to the directory to create
            user_mask: user mask to apply for directory mode

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        kwargs['targets'] = [directory]
        self._umask = user_mask
        super().__init__(**kwargs)

    @property
    def task(self) -> types.TaskDict:
        task = self.basic_task
        task.update({
            'title': utils.title_with_target1('MKDIR'),
            'actions': [(self._run, [task['targets'][0], self._umask])],
            'uptodate': [True],
        })
        return task

    @staticmethod
    def _run(directory: Path, user_mask: Optional[int] = None) -> None:
        if user_mask is not None:
            prev_umask = umask(user_mask)
        directory.mkdir(exist_ok=True)
        if user_mask is not None:
            umask(prev_umask)
