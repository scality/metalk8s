#!/usr/bin/env python3
# coding: utf-8
# pylint:disable=unused-wildcard-import


"""Build entry point."""


import doit  # type: ignore

from buildchain.build import *
from buildchain.iso import *
from buildchain.lint import *
from buildchain.vagrant import *


# mypy doesn't know the type of `doit.reporter.ConsoleReporter`.
class PrivateReporter(doit.reporter.ConsoleReporter):  # type: ignore
    """A custom reporter that display public AND private tasks."""
    desc = 'console, display both public and private tasks'

    def execute_task(self, task: doit.task.Task) -> None:
        """Called when a task is executed."""
        # Ignore tasks that do not define actions.
        if task.actions:
            self.write('.  {}\n'.format(task.title()))

    def skip_uptodate(self, task: doit.task.Task) -> None:
        """Called when a task is skipped (up-to-date)."""
        self.write('-- {}\n'.format(task.title()))

    def skip_ignore(self, task: doit.task.Task) -> None:
        """Called when a task is skipped (ignored)."""
        self.write('!! {}\n'.format(task.title()))


DOIT_CONFIG = {
    'default_tasks': ['iso'],
    'reporter': PrivateReporter,
    'cleandep': True,
}
