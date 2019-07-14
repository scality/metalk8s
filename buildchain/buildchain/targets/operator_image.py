# coding: utf-8


"""Provides container image construction for Kubernetes Operator.

Those are very similar to the locally built images, except that they are build
by the `operator-sdk` command (which also takes care of compiling the Go code)
instead of calling Docker directly.
"""


from pathlib import Path
import shlex
from typing import Any, List

import doit # type: ignore

from buildchain import config
from buildchain import constants
from buildchain import types

from . import local_image


class OperatorImage(local_image.LocalImage):
    """A locally built container image for a Kubernetes Operator."""
    def __init__(
        self, name: str, version: str, destination: Path, **kwargs: Any
    ):
        """Initialize an operator container image.

        Arguments:
            name:         image name
            version:      image version
            destination:  where to save the result

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        dockerfile = constants.ROOT/name/'build'/'Dockerfile'
        kwargs.setdefault('task_dep', []).append('check_for:operator-sdk')
        super().__init__(
            name=name, version=version, dockerfile=dockerfile,
            destination=destination, save_on_disk=True, build_args=None,
            **kwargs
        )

    def _do_build(self) -> List[types.Action]:
        """Return the actions used to build the image."""
        cwd = constants.ROOT/self.name
        cmd = ' '.join(map(shlex.quote, [
            config.ExtCommand.OPERATOR_SDK.value, 'build', self.tag
        ]))
        return [doit.action.CmdAction(cmd, cwd=cwd)]
