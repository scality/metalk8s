# coding: utf-8


"""Provides container image construction for Kubernetes Operator.

Those are very similar to the locally built images, except that they are build
by the `operator-sdk` command (which also takes care of compiling the Go code)
instead of calling Docker directly.
"""


from pathlib import Path
from typing import Any, List

from buildchain import builder
from buildchain import constants
from buildchain import docker_command
from buildchain import types
from buildchain import utils

from . import local_image


class OperatorImage(local_image.LocalImage):
    """A locally built container image for a Kubernetes Operator."""

    def __init__(self, name: str, version: str, destination: Path, **kwargs: Any):
        """Initialize an operator container image.

        Arguments:
            name:         image name
            version:      image version
            destination:  where to save the result

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        dockerfile = constants.ROOT / name / "build" / "Dockerfile"
        kwargs.setdefault("task_dep", []).append(
            "_build_builder:{}".format(builder.GO_BUILDER.name)
        )
        super().__init__(
            name=name,
            version=version,
            dockerfile=dockerfile,
            destination=destination,
            save_on_disk=True,
            build_args=None,
            **kwargs
        )

    def _do_build(self) -> List[types.Action]:
        """Return the actions used to build the image."""
        return [
            docker_command.DockerRun(
                command=["/entrypoint.sh", self.tag],
                builder=builder.GO_BUILDER,
                run_config=docker_command.default_run_config(
                    constants.STORAGE_OPERATOR_ROOT / "entrypoint.sh"
                ),
                mounts=[
                    utils.bind_mount(
                        target=Path("/storage-operator"),
                        source=constants.STORAGE_OPERATOR_ROOT,
                    ),
                    # This container (through operator-sdk) will call `docker
                    # build`, so we need to expose our Docker socket.
                    utils.bind_mount(
                        target=Path("/var/run/docker.sock"),
                        source=Path("/var/run/docker.sock"),
                    ),
                ],
            )
        ]
