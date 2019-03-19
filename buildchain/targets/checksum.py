# coding: utf-8


"""Provides file checksum computation, same output format as `sha256sum`."""


from pathlib import Path
from typing import Any, Sequence, Set

from buildchain import constants
from buildchain import coreutils
from buildchain import types
from buildchain import utils
from buildchain.targets.base import FileTarget


class Sha256Sum(FileTarget):
    """Compute the sha256 digest of a list of files."""

    def __init__(
        self, input_files: Sequence[Path], output_file: Path, **kwargs: Any
    ):
        """Configure a the checksum computation.

        Arguments:
            input_files: paths to files we want to checksum
            output_file: path to the output file

        Keyword Arguments:
            They are passed to `FileTarget` init method.
        """
        # Insert in front, to have an informative title.
        kwargs['file_dep'] = input_files
        super().__init__(destination=output_file, **kwargs)

    @property
    def task(self) -> dict:
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
