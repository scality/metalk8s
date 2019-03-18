# coding: utf-8


"""Common types definitions and aliases."""


from typing import Any, Callable, Dict, List, Tuple, Union


# A doit action.
Action = Union[
    # A Python function with no arguments.
    Callable[[], Any],
    # A Python function with *args and **kwargs.
    Tuple[Callable[..., Any], List[Any], Dict[str, Any]],
    # A shell command (as a list of string).
    List[str],
]
