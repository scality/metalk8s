# coding: utf-8


"""Task to create the build root."""


from buildchain import config
from buildchain import targets
from buildchain import utils


# This task is always the first one to be executed, as all the build will happen
# inside the build tree, we must create the root directory first.
def task__build_root() -> dict:
    """Create the build root."""
    return targets.Mkdir(directory=config.BUILD_ROOT).task


__all__ = utils.export_only_tasks(__name__)
