# coding: utf-8

"""
Expose Docker commands (build, run, …) as Python classes, using Docker API.

The instantiated objects are callable and can be used as doit action directly.
"""

import ast
import copy
import functools
import os
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Type, TYPE_CHECKING

import docker  # type: ignore
from docker.errors import BuildError, ContainerError  # type: ignore
from docker.types import Mount  # type: ignore
from doit.exceptions import TaskError  # type: ignore

from buildchain import constants
from buildchain import utils

# TYPE_CHECKING is always False at runtime: the import below are never executed
# => we can safely disable `cyclic-import` to avoid pylint false-positive.
# pylint: disable=cyclic-import,useless-suppression
if TYPE_CHECKING:
    from buildchain.targets import LocalImage
    from buildchain.targets.image import ContainerImage
# pylint: enable=cyclic-import,useless-suppression


DOCKER_CLIENT: docker.DockerClient = docker.from_env()

RPMLINTRC_MOUNT: Mount = utils.bind_ro_mount(
    target=Path("/rpmbuild/rpmlintrc"),
    source=constants.ROOT / "packages" / "redhat" / "common" / "rpmlintrc",
)


def default_run_config(entrypoint: Path) -> Dict[str, Any]:
    """Return a default run configuration."""
    return {
        "hostname": "build",
        "mounts": [
            utils.bind_ro_mount(target=Path("/entrypoint.sh"), source=entrypoint)
        ],
        "environment": {"TARGET_UID": os.geteuid(), "TARGET_GID": os.getegid()},
        "tmpfs": {"/tmp": ""},
        "remove": True,
    }


def default_error_handler(exc: Exception) -> str:
    """Default string formatting exception handler."""
    return str(exc)


def build_error_handler(build_error: BuildError) -> str:
    """String formatting exception handler for Docker API BuildError."""
    output_lines = []
    for item in build_error.build_log:
        if "stream" in item:
            line = item["stream"]
        elif "status" in item:
            try:
                line = "{0}: ".format(item["id"])
            except KeyError:
                line = ""
            line += item["status"]
            try:
                line += ": {0}/{1}\x1b[1K\r".format(
                    item["progressDetail"]["current"],
                    item["progressDetail"]["total"],
                )
            except KeyError:
                line += "\n"
        elif "error" in item:
            line = item["error"]
        else:
            line = "buildchain: Unknown build log entry {}".format(str(item))
        output_lines.append(line)

    return "".join(output_lines)


def container_error_handler(container_error: ContainerError) -> str:
    """String formatting exception handler for Docker API ContainerError."""
    try:
        err = ast.literal_eval(str(container_error.stderr)).decode()
    except (ValueError, SyntaxError):
        err = str(container_error.stderr)
    msg = "Command '{0}' in image '{1}' returned non-zero exit status {2}:\n{3}".format(
        container_error.command, container_error.image, container_error.exit_status, err
    )
    return msg


def task_error(
    handlers: Dict[Type[Exception], Callable[[Exception], str]]
) -> Callable[[Any], Any]:
    """Wrap a callable to create a resilient `doit` task

    This decorator wraps action functions in a try…except block that abstracts
    the exceptions raised by the underlying actions (docker API calls, file
    system actions…) and returns a result conforming to `doit`'s expectations
    in order to have `doit` manage the trace-back display:
     - None in case of successful task run
     - a TaskError instance in case of error
    """

    def wrapped_task(task_func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(task_func)
        def decorated_task(*args: Any, **kwargs: Any) -> Optional[TaskError]:
            try:
                task_func(*args, **kwargs)
            # We are broad on purpose here.
            # pylint: disable=broad-except
            except Exception as err:
                handler = handlers.get(type(err))
                if handler is None:
                    raise
                return TaskError(handler(err))
            return None

        return decorated_task

    return wrapped_task


@task_error(
    {
        docker.errors.BuildError: build_error_handler,
        docker.errors.APIError: default_error_handler,
    }
)
def docker_build(image: "LocalImage") -> None:
    """Build a Docker image using Docker API."""
    DOCKER_CLIENT.images.build(
        tag=image.tag,
        path=str(image.build_context),
        dockerfile=str(image.dockerfile),
        buildargs=image.build_args,
        forcerm=True,
    )


class DockerRun:
    """A class to expose the `docker run` command through the API client."""

    def __init__(
        self,
        command: List[str],
        builder: "ContainerImage",
        run_config: Dict[str, Any],
        environment: Optional[Dict[str, Any]] = None,
        mounts: Optional[List[Mount]] = None,
        tmpfs: Optional[Dict[str, str]] = None,
        read_only: bool = False,
    ):
        """Initialize a `docker run` callable object.

        Arguments:
            command:       the CLI `run` command or Dockerfile CMD
            builder:       the ContainerImage to `docker run`
            environment:   the `--env` option as a dict
            mounts:        file system mounts as a list, excluding tmpfs
            tmpfs:         the tmpfs mounts as a list
            run_config:    the base configuration as a dict - may include
                           environment, mounts tmpfs options
            read_only:     the `--readonly` CLI option
        """
        self.command = command
        self.builder = builder
        self.environment = environment or {}
        self.mounts = mounts or []
        self.tmpfs = tmpfs or {}
        self.run_config = run_config
        self.read_only = read_only

    def expand_config(self) -> Dict[str, Any]:
        """Expand the run configuration with given data.

        Since our base configuration contains tmpfs mounts, bind mounts and
        environment values, we interpolate the base configuration with the
        values of these parameters passed on initialization.
        Values not impacted by this interpolation are passed through as is.

        Example:

        run_config = {
          'foo': 'bar',
          'mounts': [base_mount],
          'environment': {'basevar_1': 'a', 'basevar_2': 'b'},
          'tmpfs': {'/var/tmp': ''}
        }
        tmpfs = {'/tmp': ''}
        mounts = [spec_mount, random_mount]
        environment = {'specvar_1': 'a', 'specvar_2': 'b'}

        >>> docker_command.DockerRun(
          run_config=run_config,
          mounts=mounts,
          tmpfs=tmpfs,
          environment=environment
        ).expand_config()
        {
          'foo': 'bar',
          'mounts': [base_mount, spec_mount, random_mount],
          'environment': {
            'basevar_1': 'a',
            'basevar_2': 'b',
            'specvar_1': 'a',
            'specvar_2': 'b'
          },
          'tmpfs': {'/var/tmp': '', '/tmp': ''}
        }
        """
        run_config = copy.deepcopy(self.run_config)
        config_list_keys = ["mounts"]
        for key in config_list_keys:
            run_config.setdefault(key, [])
            run_config[key].extend(getattr(self, key))

        config_dict_keys = ["environment", "tmpfs"]
        for key in config_dict_keys:
            run_config.setdefault(key, {})
            run_config[key].update(getattr(self, key))

        simple_keys = ["read_only"]
        for key in simple_keys:
            run_config[key] = getattr(self, key)

        return run_config

    @task_error(
        {
            docker.errors.ContainerError: container_error_handler,
            docker.errors.ImageNotFound: default_error_handler,
            docker.errors.APIError: default_error_handler,
        }
    )
    def __call__(self) -> None:
        run_config = self.expand_config()
        DOCKER_CLIENT.containers.run(
            image=self.builder.tag, command=self.command, **run_config
        )


@task_error(
    {
        docker.errors.BuildError: build_error_handler,
        docker.errors.APIError: default_error_handler,
    }
)
def docker_tag(repository: str, full_name: str, version: str) -> None:
    """Tag an image using the Docker API.

    Arguments:
        repository: the repository to which the tag should be pushed
        full_name:  the fully qualified image name
        version:    the version to tag the image with
    """
    image_to_tag = DOCKER_CLIENT.images.get(full_name)
    image_to_tag.tag(repository, tag=version)


@task_error(
    {
        docker.errors.BuildError: build_error_handler,
        docker.errors.APIError: default_error_handler,
        ValueError: default_error_handler,
    }
)
def docker_pull(repository: str, name: str, version: str, digest: str) -> None:
    """Pull a Docker image using Docker API.

    Arguments:
        repository: the repository to pull from
        name:       the image name to pull from the repository
        version:    the version of the image to pull
        digest:     the expected digest of the image to pull
    """
    pulled = DOCKER_CLIENT.images.pull(
        # For some reason, the repository must include the image name…
        "{}/{}".format(repository, name),
        tag=version,
    )
    if pulled.id != digest:
        raise ValueError(
            "Image {name}:{version} pulled from {repository} "
            "doesn't match expected digest: "
            "expected {digest}, got {observed_digest}".format(
                name=name,
                version=version,
                repository=repository,
                digest=digest,
                observed_digest=pulled.id,
            )
        )


@task_error(
    {
        docker.errors.APIError: default_error_handler,
        OSError: default_error_handler,
    }
)
def docker_save(tag: str, save_path: Path) -> None:
    """Save a Docker image using Docker API.

    Arguments:
        tag:        the image's repository and tag
        save_path:  the resulting image save path
    """
    to_save = DOCKER_CLIENT.images.get(tag)
    image_stream = to_save.save(named=True)

    with save_path.open("wb") as image_file:
        for chunk in image_stream:
            image_file.write(chunk)


def docker_image_exists(tag: str) -> bool:
    """Check if the image identified by `tag` exists in the local registry."""
    try:
        docker_image = DOCKER_CLIENT.images.get(tag)
        return docker_image is not None
    except docker.errors.ImageNotFound:
        return False
