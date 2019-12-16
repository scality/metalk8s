from buildplan import core
from buildplan import shell
from buildplan.dsl import base


def set_debug_stage_properties(*stages):
    yield shell.Bash(
        "Compute stages to debug",
        "eve/scripts/mark-for-debug.sh",
        env={
            "DEBUG_STAGES": " ".join(stages),
            "DEBUG_PROPERTY": "%(prop:debug)s",
        },
        halt_on_failure=True,
        hide_step_if=True,
    )

    for stage in stages:
        yield core.SetPropertyFromCommand(
            "Mark stage '{}' for debugging".format(stage),
            property_name="run_debug_{}".format(stage.replace("-", "_")),
            command="bash -c '{}'".format(
                shell._and(
                    ". ./.debug_stages", "echo ${{DEBUG_{stage}:-false}}"
                ).format(stage=stage.replace("-", "_"))
            ),
            hide_step_if=True,
        )


class WithDebug(base.StageDecorator):
    """Add a waiting step at the end of stage to help with debugging."""

    def __init__(self, duration=3600):
        self.duration = duration

    def mutate(self, stage):
        stage.steps.append(
            shell.Shell(
                "Debug step - wait before allowing resource destruction",
                shell._and(
                    'echo "Waiting {duration} seconds"', "sleep {duration}"
                ).format(duration=self.duration),
                timeout=str(self.duration),
                do_step_if="%(prop:run_debug_{})s".format(
                    stage.name.replace("-", "_")
                ),
                always_run=True,
            )
        )
