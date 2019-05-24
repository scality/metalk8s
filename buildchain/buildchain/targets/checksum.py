# coding: utf-8


"""Provides file checksum computation, same output format as `sha256sum`."""


from pathlib import Path
from typing import Any, Sequence, Set

from buildchain import constants
from buildchain import coreutils
from buildchain import types
from buildchain import utils

from . import base


class Sha256Sum(base.AtomicTarget):
    """Compute the sha256 digest of a list of files."""

    def __init__(
        self, input_files: Sequence[Path], output_file: Path, **kwargs: Any
    ):
        """Configure a the checksum computation.

        Arguments:
            input_files: paths to files we want to checksum
            output_file: path to the output file

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        kwargs['targets'] = [output_file]
        # Insert in front, to have an informative title.
        kwargs['file_dep'] = input_files
        super().__init__(**kwargs)

    @property
    def task(self) -> types.TaskDict:
        task = self.basic_task
        task.update({
            'title': self._show,
            'actions': [self._run],
        })
        return task

    @staticmethod
    def _show(task: types.Task) -> str:
        """Return a description of the task."""
        files = [str(utils.build_relpath(Path(path))) for path in task.file_dep]
        return '{cmd: <{width}} {files}'.format(
            cmd='SHA256SUM', width=constants.CMD_WIDTH, files=' '.join(files)
        )

    @staticmethod
    def _run(dependencies: Set[str], targets: Sequence[str]) -> None:
        input_files = [Path(path) for path in dependencies]
        coreutils.sha256sum(input_files, Path(targets[0]))
