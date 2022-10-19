import subprocess

import click


class LogFileError(click.BadParameter):
    """Some error occured while validating and/or creating the log file."""

    def __init__(self, message: str, exit_code: int = 1):
        super().__init__(message)
        self.exit_code = exit_code


class Error(Exception):
    """Base exception for metalctl."""


class ResultError(Error):
    """An error extracted from a parsed Result."""

    def __init__(self, result: subprocess.CompletedProcess):
        self.retcode = result.returncode
        self.out = result.stdout
        self.err = result.stderr
        self.cmd = " ".join(result.args)
        super().__init__(str(self))

    def __str__(self):
        return (
            f"Command '{self.cmd}' failed with retcode {self.retcode}:\n"
            f"stdout: {self.out}\nstderr: {self.err}"
        )


class StateError(Error):
    """An error extracted from a Salt state execution."""

    def __init__(self, low_data, msg=None):
        self.id = low_data["__id__"]
        self.comment = low_data["comment"]
        self.duration = low_data["duration"]
        self.sls = low_data.get("__sls__")
        self.name = low_data.get("name")

        if msg is None:
            msg = (
                f"Failed running state '{self.id}' "
                f"(took {self.duration:.0f}ms): {self.comment}"
            )
        super().__init__(msg)
