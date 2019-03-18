# coding: utf-8


"""Provides operations on directories."""


from pathlib import Path
from typing import Any

import doit  # type: ignore

from buildchain import utils
import buildchain.targets.base as base


class Mkdir(base.Target, base.AtomicTarget):
    """Create a directory."""

    def __init__(self, directory: Path, **kwargs: Any):
        """Initialize with the target directory.

        Arguments:
            directory: path to the directory to create

        Keyword Arguments:
            They are passed to `FileTarget` init method.
        """
        kwargs['targets'] = [directory]
        super().__init__(**kwargs)

    @property
    def task(self) -> dict:
        task = self.basic_task
        task.update({
            'title': lambda task: utils.title_with_target1('MKDIR', task),
            'actions': [(self._run, [task['targets'][0]])],
            'uptodate': [doit.tools.run_once],
        })
        return task

    @staticmethod
    def _run(directory: Path) -> None:
        directory.mkdir()
