import pathlib

from buildplan import core
from buildplan import shell
from buildplan.dsl import base


BUILD_STATUS_ARTIFACTS = pathlib.Path("build_status")


def set_final_status(status, stage_name=None):
    step_name = "Set build status to '{}'".format(status)

    if stage_name is not None:
        build_status_dir = BUILD_STATUS_ARTIFACTS / "build_status" / stage_name
        step_name += " for {}".format(stage_name)
    else:
        # Keep ".final_status" at the root of uploaded artifacts so it gets
        # picked up by the `/last_failure` or `/last_success` queries
        build_status_dir = BUILD_STATUS_ARTIFACTS

    return shell.Shell(
        step_name,
        command=shell._and(
            "mkdir -p {}".format(build_status_dir),
            "echo -n '{}' > {}".format(
                status, build_status_dir / ".final_status"
            ),
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


class WithStatus(base.StageDecorator):
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
