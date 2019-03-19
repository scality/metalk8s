# coding: utf-8


"""Common types definitions and aliases."""


from typing import Any, Callable, Dict, List, Tuple, Union

import doit  # type: ignore


# A doit action.
Action = Union[
    # A Python function with no arguments.
    Callable[[], Any],
    # A Python function with *args and **kwargs.
    Tuple[Callable[..., Any], List[Any], Dict[str, Any]],
    # A shell command (as a list of string).
    List[str],
]

# A doit task.
Task = doit.task.Task

# A doit task (as dict)
TaskDict = Dict[str, Any]
