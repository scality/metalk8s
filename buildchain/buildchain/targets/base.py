# coding: utf-8


"""Base classes definition for classes that produces tasks."""


import abc
import operator
from pathlib import Path
from typing import List, Optional, Sequence

from buildchain import types


class Target:
    """Base class for target that generate tasks."""

    def __init__(
        self,
        targets: Optional[Sequence[Path]]=None,
        file_dep: Optional[Sequence[Path]]=None,
        task_dep: Optional[Sequence[str]]=None,
        basename: Optional[str]=None,
        task_name: Optional[str]=None,
    ):
        """Initialize the input/output of the target.

        Arguments:
            targets:  paths to the output files
            file_dep: paths to the input files, if any
            task_dep: names of the prerequisites tasks, if any
            basename: tasks basename
            name:     name of the sub-task
        """
        self._actions  = []  # type: List[types.Action]
        self._targets  = targets or []
        self._file_dep = file_dep or []
        self._task_dep = task_dep or []
        self._basename = basename
        self._task_name = task_name

    actions   = property(operator.attrgetter('_actions'))
    targets   = property(operator.attrgetter('_targets'))
    file_dep  = property(operator.attrgetter('_file_dep'))
    task_dep  = property(operator.attrgetter('_task_dep'))
    task_name = property(operator.attrgetter('_task_name'))

    @property
    def basename(self) -> Optional[str]:
        """Task basename."""
        return self._basename

    @property
    def basic_task(self) -> types.TaskDict:
        """Minimal default task that can be build upon."""
        task = {
            'actions': self.actions.copy(),
            'targets': self.targets.copy(),
            'file_dep': self.file_dep.copy(),
            'task_dep': self.task_dep.copy(),
            'clean': True
        }
        if self.basename:
            task['basename'] = self.basename
        if self.task_name:
            task['name'] = self.task_name
        return task



class AtomicTarget(Target, abc.ABC):
    """Target that can be built with a single task."""

    @property
    @abc.abstractmethod
    def task(self) -> types.TaskDict:
        """Task producing the target."""


class CompositeTarget(Target, abc.ABC):
    """Target whose build requires multiple tasks."""

    @property
    @abc.abstractmethod
    def execution_plan(self) -> List[types.TaskDict]:
        """List of tasks producing the target."""
