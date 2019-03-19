# coding: utf-8


"""Provides the copy of a whole file tree.

Following the motto "Explicit is better than implicit", only listed files are
copied (it's not like a `cp -R`).

This module handles both "simple" copy as well a file target (i.e. task that
generate a single output file).

Overview:

                   ┌────────┐
                   │  copy  │
               ───>│ simple │
              ╱    │ files  │
┌───────────┐╱     └────────┘
│  create   │      ┌─────────────────┐
│ directory │─────>│ pull images     │
│   tree    │      └─────────────────┘
└───────────┘╲     ┌─────────────────┐
           │  ╲───>│ render template │
           │       └─────────────────┘
           │       ┌─────────────────┐
           └──────>│ …               │
                   └─────────────────┘
"""


import operator
from pathlib import Path
from typing import Any, List, Sequence, Set, Union

import doit  # type: ignore

from buildchain import constants
from buildchain import coreutils
from buildchain import types
from buildchain import utils
import buildchain.targets.base as base


MAKE_TASK_NAME : str = 'make_tree'


class FileTree(base.Target, base.CompositeTarget):
    """A hierarchy of files that to be copied under a destination directory."""

    def __init__(
        self,
        basename: str,
        files: Sequence[Union[Path, base.FileTarget]],
        destination_directory: Path,
        **kwargs: Any
    ):
        """Initialize the file hierarchy.

        Arguments:
            basename:              basename for the sub-tasks
            files:                 list of files to copy
            destination_directory: where to copy the tree

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        self._files = files
        self._dest = destination_directory
        self._dirs = [
            self._dest/directory
            for directory
            in self._compute_dir_tree(self.files)
        ]
        self._root = self.directories[0].relative_to(self.destination)
        super().__init__(
            basename='{base}:{root}'.format(base=basename, root=self._root),
            **kwargs
        )

    directories = property(operator.attrgetter('_dirs'))
    destination = property(operator.attrgetter('_dest'))

    @property
    def files(self) -> List[Path]:
        """Path of all the file in the hierarchy."""
        paths = []
        for item in self._files:
            if isinstance(item, base.FileTarget):
                item = item.destination.relative_to(self.destination)
            paths.append(item)
        return paths

    @property
    def execution_plan(self) -> List[dict]:
        tasks = [
            self.make_directories(),
            self.copy_files(),
        ]
        for target in self._files:
            if not isinstance(target, base.FileTarget):
                continue
            task = target.task
            task['basename'] = self.basename
            task['task_dep'].append('{base}:{name}'.format(
                base=self.basename, name=MAKE_TASK_NAME
            ))
            tasks.append(task)
        return tasks

    def make_directories(self) -> dict:
        """Return a task that create a directory hierarchy."""
        def mkdirs(targets: Sequence[str]) -> None:
            for directory in targets:
                Path(directory).mkdir()

        task = self.basic_task
        task.update({
            'name': MAKE_TASK_NAME,
            'doc': 'Create directory hierarchy for {}.'.format(self._root),
            'title': lambda task: utils.title_with_target1('MKTREE', task),
            'actions': [mkdirs],
            'targets': self.directories,
            'uptodate': [doit.tools.run_once],
        })
        return task

    def copy_files(self) -> dict:
        """Copy a list of files to their destination."""
        def show(_task: types.Task) -> str:
            return '{cmd: <{width}} {path}'.format(
                cmd='CPTREE', width=constants.CMD_WIDTH, path=self._root
            )

        task = self.basic_task
        task.update({
            'name': 'copy_tree',
            'doc': 'Copy files tree to {}.'.format(self._root),
            'title': show
        })
        task['task_dep'].append('{base}:{name}'.format(
            base=self.basename, name=MAKE_TASK_NAME
        ))
        # Copy "plain" files (file paths, not targets).
        for path in self._files:
            if isinstance(path, base.FileTarget):
                continue
            destination = self.destination/path
            task['actions'].append(
                (coreutils.cp_file, [path, destination])
            )
            task['targets'].append(destination)
            task['file_dep'].append(path)
        return task

    @staticmethod
    def _compute_dir_tree(files: Sequence[Path]) -> List[Path]:
        """Compute the directory hierarchy to be created."""
        dirs : Set[Path] = set()
        for path in files:
            dirs.update(path.parents)
        dirs.discard(Path('.'))
        # Sort by depth, from the root to the leaves.
        return sorted(dirs, key=lambda path: str(path).count('/'))
