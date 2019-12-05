from collections import OrderedDict

import pytest

from buildplan import core
from buildplan import dsl


class TestStageDecorators:
    DEFAULT_STEP = core.ShellCommand("Default step", "exit 0")

    @classmethod
    def stage_factory(cls):
        return core.Stage(
            "example", worker=core.LocalWorker(), steps=[cls.DEFAULT_STEP]
        )

    def test_base_class(self):
        class Implementer(dsl.StageDecorator):
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
                    dsl.set_final_status("FAILED", stage_name="example"),
                    self.DEFAULT_STEP,
                    dsl.set_final_status("SUCCESSFUL", stage_name="example"),
                    dsl.upload_final_status(),
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
                    self.DEFAULT_STEP,
                    core.Upload("Upload artifacts", source=dsl.ARTIFACTS),
                ],
            ).dump()
        )

    def test_with_setup(self):
        # TODO: test the result of each setup step
        decorated_factory = dsl.WithSetup(
            [
                dsl.SetupStep.GIT,
                dsl.SetupStep.CACHE,
                dsl.SetupStep.DOCKER,
                dsl.SetupStep.SSH,
            ]
        )(self.stage_factory)
        decorated_stage = decorated_factory()
        assert len(decorated_stage.steps) == 5
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
                    self.DEFAULT_STEP,
                ],
            ).dump()
        )


class TestCopyArtifacts:
    @pytest.mark.parametrize(
        "sources,destination,expected",
        (
            (
                ["somefile", "someother"],
                None,
                {
                    "name": "Copy artifacts",
                    "command": (
                        "mkdir -p artifacts; "
                        "for artifact in somefile someother; "
                        'do cp -r "$artifact" artifacts; done'
                    ),
                },
            ),
            (
                ["somefile", "somedir/*"],
                "prefix",
                {
                    "name": "Copy artifacts for 'prefix'",
                    "command": (
                        "mkdir -p artifacts/prefix; "
                        "for artifact in somefile somedir/*; "
                        'do cp -r "$artifact" artifacts/prefix; done'
                    ),
                },
            ),
        ),
    )
    def test_dump(self, sources, destination, expected):
        step = dsl.CopyArtifacts(sources, destination=destination)
        expected_body = OrderedDict(
            [("name", expected["name"]), ("command", expected["command"],),]
        )

        assert step.dump()["ShellCommand"] == expected_body


@pytest.mark.parametrize(
    "sources,expected",
    (
        (["some", "other"], [dsl.CopyArtifacts(["some", "other"])]),
        (
            {"prefix": ["somefile"], "otherprefix": ["otherfile"]},
            [
                dsl.CopyArtifacts(["somefile"], destination="prefix"),
                dsl.CopyArtifacts(["otherfile"], destination="otherprefix"),
            ],
        ),
    ),
)
def test_copy_artifacts(sources, expected):
    steps = list(dsl.copy_artifacts(sources))
    assert len(steps) == len(expected)

    for left, right in zip(steps, expected):
        assert left.dump() == right.dump()
