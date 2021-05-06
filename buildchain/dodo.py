#!/usr/bin/env python3
# coding: utf-8
# pylint:disable=unused-wildcard-import


"""Build entry point."""

from typing import Any, Dict, List, TextIO
import sys

import doit  # type: ignore

from buildchain import constants
# from buildchain.build import *
# from buildchain.builder import *
# from buildchain.codegen import *
# from buildchain.deps import *
# from buildchain.docs import *
# from buildchain.image import *
# from buildchain.iso import *
# from buildchain.format import *
# from buildchain.lint import *
# from buildchain.packaging import *
# from buildchain.salt_tree import *
# from buildchain.ui import *
# from buildchain.shell_ui import *
# from buildchain.vagrant import *
from buildchain.calc_deps import *


# mypy doesn't know the type of `doit.reporter.JsonReporter`.
class CustomReporter(doit.reporter.JsonReporter):  # type: ignore
    """A custom reporter that display a JSON object for each task."""

    tag = {
        "started": "\033[1;33mSTARTED\033[0m  ",
        "success": "\033[1;32mSUCCESS\033[0m  ",
        "failed": "\033[1;31mFAILED\033[0m   ",
        "skipped": "\033[1;34mSKIPPED\033[0m  ",
        "ignored": "\033[1;35mIGNORED\033[0m  ",
    }
    desc = "console, display the execution of each task, generate a build log"

    def __init__(self, outstream: TextIO, options: Dict[str, Any]):
        super().__init__(outstream, options)
        self.failures: List[Dict[str, Any]] = []
        self.runtime_errors: List[str] = []
        self.failure_verbosity: int = options.get("failure_verbosity", 0)

    def execute_task(self, task: doit.task.Task) -> None:
        """Called when a task is executed."""
        super().execute_task(task)
        if task.actions:  # Ignore tasks that do not define actions.
            self._write("{}{}\n".format(self.tag["started"], task.title()))

    def add_failure(
        self, task: doit.task.Task, exception: doit.exceptions.CatchedException
    ) -> None:
        """Called when execution finishes with a failure"""
        super().add_failure(task, exception)
        result = {"task": task, "exception": exception}
        self.failures.append(result)
        if task.actions:
            time_elapsed = self.t_results[task.name].to_dict()["elapsed"] or 0
            self._write(
                "{}{} [{:.0f}s]\n".format(
                    self.tag["failed"], task.title(), time_elapsed
                )
            )
            self._write_failure(result, task.verbosity > 1, task.verbosity > 0)

    def add_success(self, task: doit.task.Task) -> None:
        """Called when execution finishes successfully"""
        super().add_success(task)
        if task.actions:
            time_elapsed = self.t_results[task.name].to_dict()["elapsed"]
            self._write(
                "{}{} [{:.0f}s]\n".format(
                    self.tag["success"], task.title(), time_elapsed
                )
            )
            self._write_task_output(task, task.verbosity > 1, task.verbosity > 0)

    def skip_uptodate(self, task: doit.task.Task) -> None:
        """Called when a task is skipped (up-to-date)."""
        super().skip_uptodate(task)
        self._write("{}{}\n".format(self.tag["skipped"], task.title()))

    def skip_ignore(self, task: doit.task.Task) -> None:
        """Called when a task is skipped (ignored)."""
        super().skip_ignore(task)
        self._write("{}{}\n".format(self.tag["ignored"], task.title()))

    def cleanup_error(self, exception: doit.exceptions.CatchedException) -> None:
        """Error during cleanup."""
        self._write(exception.get_msg())

    def runtime_error(self, msg: str) -> None:
        """Error from doit itself (not from a task execution)."""
        # saved so they are displayed after task failures messages
        self.runtime_errors.append(msg)

    def complete_run(self) -> None:
        """Called when finished running all tasks."""
        # If test fails print output from failed task.
        failure_header = "#" * 40 + "\n"
        for result in self.failures:
            task = result["task"]
            # Makes no sense to print output if task was not executed.
            if not task.executed:
                continue
            show_err = task.verbosity < 1 or self.failure_verbosity > 0
            show_out = task.verbosity < 2 or self.failure_verbosity == 2
            if show_err or show_out:
                self._write(failure_header)
            self._write_failure(result, show_out, show_err)

        if self.runtime_errors:
            self._write(failure_header)
            self._write("Execution aborted.\n")
            self._write("\n".join(self.runtime_errors))
            self._write("\n")

        # Generate the build log.
        build_log = constants.ROOT / "build.log"
        with build_log.open("w", encoding="utf-8") as fp:
            self.outstream = fp
            super().complete_run()

    def _write(self, text: str) -> None:
        self.outstream.write(text)

    def _write_task_output(
        self, task: doit.task.Task, show_out: bool, show_err: bool
    ) -> None:
        if show_out:
            out = "".join([action.out for action in task.actions if action.out])
            if out:
                self._write("{0} <stdout>:\n{1}\n".format(task.name, out))
        if show_err:
            err = "".join([action.err for action in task.actions if action.err])
            if err:
                self._write("{0} <stderr>:\n{1}\n".format(task.name, err))

    def _write_failure(
        self, result: Dict[str, Any], show_out: bool, show_err: bool
    ) -> None:
        task = result["task"]
        if show_err:
            self._write(
                "{0} - taskid:{1}\n{2}\n".format(
                    result["exception"].get_name(),
                    task.name,
                    result["exception"].get_msg(),
                )
            )
        self._write_task_output(task, show_out, show_err)


DOIT_CONFIG = {
    "default_tasks": ["iso"],
    "reporter": CustomReporter,
    "cleandep": True,
    "cleanforget": True,
}

# Because some code (in `doit` or even below) seems to be using a dangerous mix
# of threads and fork, the workers processes are killed by macOS (search for
# OBJC_DISABLE_INITIALIZE_FORK_SAFETY for the details).
#
# Until the guilty code is properly fixed (if ever), let's force the use of
# threads instead of forks on macOS to sidestep the issue.
if sys.platform == "darwin":
    DOIT_CONFIG["par_type"] = "thread"
