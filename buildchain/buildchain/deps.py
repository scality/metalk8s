"""Dependency checker for skopeo, vagrant, git, mkisofs and hard-link."""


from pathlib import Path
from typing import Optional, Iterator
import shutil

from doit.exceptions import TaskError  # type: ignore

from buildchain import config
from buildchain import constants
from buildchain import types
from buildchain import utils


def task_check_for() -> Iterator[types.TaskDict]:
    """Check the existence of the external commands."""
    def get_command_location(
        command_name: str, binary_path: Optional[str]
    ) -> Optional[TaskError]:
        """Check the existence of the given command.

        If the user already specified a path for it, check for the existence
        of the binary at the given location. Otherwise, look it up from PATH.

        If the binary is not found, the task fails.
        """
        if binary_path:
            path = Path(binary_path)
            cmd_path = shutil.which(path.name, path=str(path.parent))
        else:
            cmd_path = shutil.which(command_name)
        if cmd_path is None:
            return TaskError(msg='command {} not found in {}'.format(
                command_name, Path(binary_path).parent
                if binary_path else '$PATH'
            ))
        return None

    for ext_cmd in config.ExtCommand:
        cmd_name = ext_cmd.command_name
        cmd_path = ext_cmd.value if ext_cmd.value != cmd_name else None

        def show(name: str) -> str:
            return '{cmd: <{width}} {name}'.format(
                cmd='CHECK CMD', width=constants.CMD_WIDTH, name=name
            )

        yield {
            'name': cmd_name,
            'title': lambda _, name=cmd_name: show(name),
            'doc': 'Check the presence of the {} command.'.format(cmd_name),
            'actions': [(get_command_location, [cmd_name, cmd_path], {})],
            'file_dep': [],
            'task_dep': [],
            'uptodate': [False],
        }


__all__ = utils.export_only_tasks(__name__)
