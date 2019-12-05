"""Helper functionalities built on top of `buildplan.core` components."""

import abc
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
