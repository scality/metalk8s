# coding: utf-8


"""Provides operations on directories."""


from pathlib import Path
from typing import Any

from buildchain import types
from buildchain import utils

from . import base


class Mkdir(base.AtomicTarget):
    """Create a directory."""

    def __init__(self, directory: Path, **kwargs: Any):
        """Initialize with the target directory.

        Arguments:
            directory: path to the directory to create

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        kwargs['targets'] = [directory]
        super().__init__(**kwargs)

    @property
    def task(self) -> types.TaskDict:
        task = self.basic_task
        task.update({
            'title': utils.title_with_target1('MKDIR'),
            'actions': [(self._run, [task['targets'][0]])],
            'uptodate': [True],
        })
        return task

    @staticmethod
    def _run(directory: Path) -> None:
        directory.mkdir(exist_ok=True)
