"""Helper functionalities built on top of `buildplan.core` components."""

import abc
from collections import Mapping
import enum
import functools
import pathlib

from buildplan import core
from buildplan import shell


# Default working directory, often used as prefix
BUILD_DIR = pathlib.Path("build")


class StageDecorator(metaclass=abc.ABCMeta):
    """Decorator for `core.Stage` factories.

    Such decorators will allow to mutate the generated `Stage` object,
    changing `.steps` for instance.
    """

    def __call__(self, stage_factory):
        @functools.wraps(stage_factory)
        def decorated(*args, **kwargs):
            stage = stage_factory(*args, **kwargs)
            self.mutate(stage)
            return stage

        return decorated

    @abc.abstractmethod
    def mutate(self, stage):
        """Mutate a stage object after its generation from a factory."""
        pass  # pragma: no cover
