"""Stubs for utils"""

import abc
import argparse
from typing import (
    Any, Callable, ClassVar, Dict, Iterable, List, Optional, Tuple, Type,
)


class Command(metaclass=abc.ABCMeta):
    NAME: ClassVar[Optional[str]]
    SUBCOMMANDS: ClassVar[List[Type['Command']]]
    ARGUMENTS: ClassVar[Dict[Tuple[str, ...], Dict[str, Any]]]
    PARENT_PARSERS: ClassVar[List[Callable[[], argparse.ArgumentParser]]]

    def __init__(self, args: argparse.Namespace) -> None: ...

    @classmethod
    def prepare_parser(
        cls,
        parser: argparse.ArgumentParser,
        parents: Iterable[argparse.ArgumentParser],
        prog: str,
    ) -> None: ...

    @abc.abstractmethod
    def run(self) -> None: ...

    @property
    def command_invocation(self) -> str: ...
