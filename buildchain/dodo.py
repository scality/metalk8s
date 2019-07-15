#!/usr/bin/env python3
# coding: utf-8
# pylint:disable=unused-wildcard-import


"""Build entry point."""

import sys

import doit  # type: ignore

from buildchain.build import *
from buildchain.codegen import *
from buildchain.deps import *
from buildchain.image import *
from buildchain.iso import *
from buildchain.format import *
from buildchain.lint import *
from buildchain.packaging import *
from buildchain.salt_tree import *
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
    'cleanforget': True,
}

# Because some code (in `doit` or even below) seems to be using a dangerous mix
# of threads and fork, the workers processes are killed by macOS (search for
# OBJC_DISABLE_INITIALIZE_FORK_SAFETY for the details).
#
# Until the guilty code is properly fixed (if ever), let's force the use of
# threads instead of forks on macOS to sidestep the issue.
if sys.platform == 'darwin':
    DOIT_CONFIG['par_type'] = 'thread'
