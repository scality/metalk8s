"""Helper functionalities built on top of `buildplan.core` components."""

import abc
from collections import Mapping
import enum
import functools
import pathlib

from buildplan import core


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


# Build status {{{
BUILD_STATUS_ARTIFACTS = pathlib.Path("build_status")


def set_final_status(status, stage_name=None):
    build_status_dir = BUILD_STATUS_ARTIFACTS / "build_status"
    step_name = "Set build status to '{}'".format(status)
    if stage_name is not None:
        build_status_dir /= stage_name
        step_name += " for {}".format(stage_name)

    return core.ShellCommand(
        step_name,
        command="mkdir -p {} && echo '{}' > {}".format(
            build_status_dir, status, build_status_dir / ".final_status"
        ),
        halt_on_failure=True,
        hide_step_if=True,
    )


def upload_final_status():
    return core.Upload(
        "Upload final status to artifacts",
        source=BUILD_STATUS_ARTIFACTS,
        always_run=True,
        hide_step_if=True,
    )


class WithStatus(StageDecorator):
    """Decorate a stage to manage build status info in artifacts."""

    def __init__(self, is_root=False):
        self.is_root = is_root

    def mutate(self, stage):
        stage_name = None if self.is_root else stage.name

        # By default, status is failed, so we set it before running anything
        stage.steps.insert(
            0, set_final_status("FAILED", stage_name=stage_name),
        )

        # If the build completed successfully and did not halt, we will set
        # a successful status. In any case, we will upload the status to
        # artifacts at the end of this stage.
        stage.steps.extend(
            [
                set_final_status("SUCCESSFUL", stage_name=stage_name),
                upload_final_status(),
            ]
        )


# }}}
# Artifacts {{{
ARTIFACTS = pathlib.Path("artifacts")


class CopyArtifacts(core.ShellCommand):
    STEP_NAME = "ShellCommand"

    def __init__(self, sources, destination=None, **kwargs):
        if destination is not None:
            dest_dir = ARTIFACTS / destination
        else:
            dest_dir = ARTIFACTS

        self.dest_dir = dest_dir
        self.sources = sources
        self._kwargs = kwargs

        name = "Copy artifacts"
        if destination is not None:
            name += " for '{}'".format(destination)

        super(CopyArtifacts, self).__init__(
            name,
            command=self.__command('cp -r "$artifact" {s.dest_dir}'),
            **kwargs,
        )

    def __command(self, copy_cmd):
        return "; ".join(
            [
                "mkdir -p {s.dest_dir}",
                "for artifact in {{sources}}; do {}; done".format(copy_cmd),
            ]
        ).format(s=self, sources=" ".join(self.sources))


def copy_artifacts(sources, destination=None, **kwargs):
    if isinstance(sources, Mapping):
        yield from [
            CopyArtifacts(sources=source_list, destination=dest)
            for dest, source_list in sources.items()
        ]
    else:
        yield CopyArtifacts(
            sources=sources, destination=destination, **kwargs,
        )


class WithArtifacts(StageDecorator):
    """Automatically upload artifacts after a stage.

    Steps within the stage should copy artifacts into a well-known directory
    using the `CopyArtifacts` step (wrapper of `ShellCommand`) or the
    `copy_artifacts` helper (which can handle a mapping of destination to list
    of sources).
    """

    def __init__(self, urls=None):
        self.urls = urls

    def mutate(self, stage):
        stage.steps.append(
            core.Upload("Upload artifacts", source=ARTIFACTS, urls=self.urls)
        )


# }}}
# Setup steps {{{
class SetupStep(enum.Enum):
    GIT = "git_pull"
    CACHE = "setup_cache"
    DOCKER = "wait_for_docker"

    @property
    def step_factory(self):
        return getattr(self, self.value)

    @staticmethod
    def git_pull():
        return core.Git(
            "git pull",
            repourl="%(prop:git_reference)s",
            method="clobber",
            retry_fetch=True,
            halt_on_failure=True,
        )

    @staticmethod
    def setup_cache():
        return core.ShellCommand(
            "Setup proxy cache",
            command=" && ".join(
                [
                    "curl -s http://proxy-cache/setup.sh | sudo sh",
                    ". /usr/local/bin/use_scality_proxy_cache",
                ]
            ),
            halt_on_failure=True,
        )

    @staticmethod
    def wait_for_docker():
        return core.ShellCommand(
            "Wait for Docker daemon to be ready",
            command="bash -c '{}'".format(
                "; ".join(
                    [
                        "for i in $(seq 1 150)",
                        "do",
                        "  docker info &> /dev/null && exit",
                        "  sleep 2",
                        "done",
                        'echo "Could not reach Docker daemon from Buildbot worker" >&2',
                        "exit 1",
                    ]
                )
            ),
            halt_on_failure=True,
        )


class WithSetup(StageDecorator):
    """Prepend to the stage steps a sequence of common setup steps.

    The available values are stored in the `SetupStep` enum.
    """

    def __init__(self, setup_steps):
        assert all(step in SetupStep for step in setup_steps)
        self.setup_steps = setup_steps

    def mutate(self, stage):
        # We ensure steps are inserted in the right order with `reversed`
        for setup_step in reversed(self.setup_steps):
            stage.steps.insert(0, setup_step.step_factory())


# }}}
