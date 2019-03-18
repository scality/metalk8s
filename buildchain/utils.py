# coding: utf-8


"""Miscellaneous helpers."""


import inspect
import sys
from typing import List


def export_only_tasks(module_name: str) -> List[str]:
    """Return the list of tasks defined in the specified module.

    Arguments:
        module_name: name of the module

    Returns:
        The name of all the task-creator defined in this module.
    """
    return [
        name
        for name, _
        in inspect.getmembers(sys.modules[module_name], inspect.isfunction)
        if name.startswith('task_')
    ]
