from collections import OrderedDict
from pathlib import Path

import pytest

from buildplan import core
from buildplan import dsl
from buildplan import shell
from buildplan.dsl import artifacts, base, build_status, remote, terraform


class TestStageDecorators:
    DEFAULT_STEP = core.ShellCommand("Default step", "exit 0")

    @classmethod
    def step_factory(cls):
        return core.ShellCommand("Default step", "exit 0")

    @classmethod
    def stage_factory(cls):
        return core.Stage(
            "example", worker=core.LocalWorker(), steps=[cls.step_factory()],
        )

    def test_base_class(self):
        class Implementer(base.StageDecorator):
            def mutate(self, stage):
                stage._mutated = True

        decorated_factory = Implementer()(self.stage_factory)
        decorated_stage = decorated_factory()
        assert decorated_stage._mutated

    def test_with_status(self):
        decorated_factory = dsl.WithStatus()(self.stage_factory)
        decorated_stage = decorated_factory()
        assert len(decorated_stage.steps) == 4
        assert (
            decorated_stage.dump()
            == core.Stage(
                "example",
                worker=core.LocalWorker(),
                steps=[
                    build_status.set_final_status(
                        "FAILED", stage_name="example"
                    ),
                    self.step_factory(),
                    build_status.set_final_status(
                        "SUCCESSFUL", stage_name="example"
                    ),
                    build_status.upload_final_status(),
                ],
            ).dump()
        )

    def test_with_artifacts(self):
        decorated_factory = dsl.WithArtifacts()(self.stage_factory)
        decorated_stage = decorated_factory()
        assert len(decorated_stage.steps) == 2
        assert (
            decorated_stage.dump()
            == core.Stage(
                "example",
                worker=core.LocalWorker(),
                steps=[
                    self.step_factory(),
                    core.Upload(
                        "Upload artifacts", source=artifacts.ARTIFACTS
                    ),
                ],
            ).dump()
        )

    @pytest.mark.parametrize(
        "step,remote_command",
        (
            (
                (
                    core.ShellCommand("Basic ShellCommand", "my-command"),
                    "ssh -F _ssh_config _host my-command",
                ),
                (
                    shell.Shell("Run some shell", "my-command --my-arg"),
                    "ssh -F _ssh_config _host my-command --my-arg",
                ),
                (
                    shell.Bash("Run some script with bash", "my-script.sh"),
                    (
                        'ssh -F _ssh_config _host [[ -f "my-script.sh" ]] '
                        "|| scp -F _ssh_config my-script.sh _host:my-script.sh "
                        "&& ssh -F _ssh_config _host bash my-script.sh"
                    ),
                ),
                (
                    shell.Bash(
                        "Run some inline bash",
                        "my-command --my-arg",
                        inline=True,
                    ),
                    "ssh -F _ssh_config _host bash -c 'my-command --my-arg'",
                ),
                (
                    artifacts.CopyArtifacts(
                        sources=["somefile", "somedir/*"],
                    ),
                    (
                        "mkdir -p artifacts; "
                        "for artifact in somefile somedir/*; "
                        "do scp -F _ssh_config -r _host:$artifact artifacts; "
                        "done"
                    ),
                ),
            )
        ),
    )
    def test_with_remote(self, step, remote_command):
        def stage_factory():
            return core.Stage(
                "remote-stage",
                worker=core.LocalWorker(),
                steps=[
                    dsl.SetupStep.git_pull(),  # local, shouldn't change
                    *dsl.on_remote(host="_host")(step),
                ],
            )

        ssh_config = Path("_ssh_config")
        decorated_factory = dsl.WithRemoteCommands(ssh_config)(stage_factory)
        remote_steps = decorated_factory().steps
        assert len(remote_steps) == 2
        assert remote_steps[0].dump() == dsl.SetupStep.git_pull().dump()
        assert (
            remote_steps[1].dump()
            == core.ShellCommand(step.name, command=remote_command).dump()
        )

    def test_with_setup(self):
        # TODO: test the result of each setup step
        decorated_factory = dsl.WithSetup(
            [
                dsl.SetupStep.GIT,
                dsl.SetupStep.CACHE,
                dsl.SetupStep.DOCKER,
                dsl.SetupStep.SSH,
                dsl.SetupStep.CHECK_DEPS,
            ]
        )(self.stage_factory)
        decorated_stage = decorated_factory()
        assert len(decorated_stage.steps) == 6
        assert (
            decorated_stage.dump()
            == core.Stage(
                "example",
                worker=core.LocalWorker(),
                steps=[
                    dsl.SetupStep.git_pull(),
                    dsl.SetupStep.setup_cache(),
                    dsl.SetupStep.wait_for_docker(),
                    dsl.SetupStep.setup_ssh(),
                    dsl.SetupStep.check_common_deps(),
                    self.step_factory(),
                ],
            ).dump()
        )

    @pytest.mark.parametrize("tf_vars", (None, {"nodes_count": "3"}))
    def test_with_terraform(self, tf_vars):
        default_factory = dsl.WithTerraform()(self.stage_factory)
        with pytest.raises(
            AssertionError, match="Only OpenStack workers are supported"
        ):
            default_factory()

        def stage_factory():
            return core.Stage(
                "tf-stage",
                worker=core.OpenStackWorker(
                    "tf-path",
                    image=core.OpenStackWorker.Image.CENTOS7,
                    flavor=core.OpenStackWorker.Flavor.MEDIUM,
                ),
                steps=[*dsl.on_remote(host="tf-host")(self.step_factory(),)],
            )

        decorated_factory = dsl.WithTerraform(
            setup_bastion=True, tf_vars=tf_vars
        )(stage_factory)
        decorated_stage = decorated_factory()
        assert len(decorated_stage.steps) == 9

        tf_path = Path("tf-path") / "terraform"
        assert (
            decorated_stage.dump()
            == core.Stage(
                "tf-stage",
                worker=core.OpenStackWorker(
                    "tf-path",
                    image=core.OpenStackWorker.Image.CENTOS7,
                    flavor=core.OpenStackWorker.Flavor.MEDIUM,
                ),
                steps=[
                    *terraform.terraform_spawn(
                        tf_path, tf_vars=tf_vars, setup_bastion=True,
                    ),
                    core.ShellCommand(
                        self.DEFAULT_STEP.name,
                        remote._ssh(
                            tf_path / "ssh_config",
                            "tf-host",
                            self.DEFAULT_STEP.command,
                        ),
                    ),
                    terraform.terraform_destroy(tf_path),
                ],
            ).dump()
        )
