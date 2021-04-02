# coding: utf-8
"""Implement custom actions used by doit tasks"""

from pathlib import Path
from typing import Any, Callable, List, Optional, Union

import doit  # type: ignore


class CmdActionOnFailure(doit.action.CmdAction):  # type: ignore
    """Wrapper around CmdAction allowing to pass a callable run if action fails"""

    def __init__(
        self,
        action: Union[str, List[Union[str, Path]], Callable[..., Optional[Any]]],
        task: Optional[doit.task.Task] = None,
        save_out: Optional[str] = None,
        shell: bool = True,
        encoding: str = "utf-8",
        decode_error: str = "replace",
        buffering: int = 0,
        on_failure: Optional[Callable[..., None]] = None,
        **pkwargs: Any
    ):
        super().__init__(
            action, task, save_out, shell, encoding, decode_error, buffering, **pkwargs
        )
        self.on_failure = on_failure

    def execute(
        self, out: Any = None, err: Any = None
    ) -> doit.exceptions.CatchedException:
        failure = super().execute(out, err)
        if failure and self.on_failure:
            self.on_failure()
        return failure
