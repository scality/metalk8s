import argparse
import contextlib
import logging
from typing import Any, Callable, Dict, Generator, Union, TypeVar

from metalk8s_cli.exceptions import CommandError


DEFAULT_CONFIG: Dict[str, Any]


class LoggingCommandMixin(object):
    def __init__(self, args: argparse.Namespace) -> None: ...

    def configure_logging(self, args: argparse.Namespace) -> None: ...

    def prepare_logfile(self) -> None: ...

    @property
    def logger(self) -> logging.Logger: ...

    @contextlib.contextmanager
    def log_step(self, step_name: str) -> Generator: ...

    @contextlib.contextmanager
    def log_active_run(self) -> Generator: ...

    def print_and_log(self, message: str,
                      level: Union[str, int]=logging.INFO) -> None: ...

    def _format_error(self, error: CommandError, step_name: str) -> str: ...

    def _append_run_limit(self, message: str) -> None: ...

    def _init_run_log(self) -> None: ...

    def _stop_run_log(self) -> None: ...


_StepType = Callable[..., None]
_Step = TypeVar('_Step', bound=_StepType)


def logged_step(step_name: str) -> Callable[[_Step], _Step]: ...
