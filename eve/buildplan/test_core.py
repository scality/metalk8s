from collections import OrderedDict

import pytest

import core


class TestDump:
    SINGLE_STAGE = core.Stage(
        name="single-stage", worker=core.LocalWorker(), steps=[]
    )
    TRIGGER_STEP = core.TriggerStages(
        "Trigger another stage", stages=[SINGLE_STAGE]
    )
    MULTI_STAGES = core.Stage(
        name="multi-stages", worker=core.LocalWorker(), steps=[TRIGGER_STEP]
    )
    PRE_MERGE = core.Stage(
        name="pre-merge",
        worker=core.LocalWorker(),
        steps=[],
        branches=["development/*", "example-branch"],
    )

    @pytest.mark.parametrize(
        "stage,expected",
        (
            (
                None,
                OrderedDict(
                    [
                        ("version", "0.2"),
                        ("branches", OrderedDict()),
                        ("stages", OrderedDict()),
                    ]
                ),
            ),
            (
                SINGLE_STAGE,
                OrderedDict(
                    [
                        ("version", "0.2"),
                        ("branches", OrderedDict()),
                        (
                            "stages",
                            OrderedDict(
                                [(SINGLE_STAGE.name, SINGLE_STAGE.dump())]
                            ),
                        ),
                    ]
                ),
            ),
            (
                PRE_MERGE,
                OrderedDict(
                    [
                        ("version", "0.2"),
                        (
                            "branches",
                            OrderedDict(
                                [
                                    (
                                        "development/*, example-branch",
                                        {"stage": PRE_MERGE.name},
                                    )
                                ]
                            ),
                        ),
                        (
                            "stages",
                            OrderedDict([(PRE_MERGE.name, PRE_MERGE.dump())]),
                        ),
                    ]
                ),
            ),
            (
                MULTI_STAGES,
                OrderedDict(
                    [
                        ("version", "0.2"),
                        ("branches", OrderedDict()),
                        (
                            "stages",
                            OrderedDict(
                                [
                                    (MULTI_STAGES.name, MULTI_STAGES.dump()),
                                    (SINGLE_STAGE.name, SINGLE_STAGE.dump()),
                                ]
                            ),
                        ),
                    ]
                ),
            ),
        ),
        ids=("empty", "no-branch", "single-stage", "multi-stages"),
    )
    def test_project(self, stage, expected):
        project = core.Project()

        if stage is not None:
            project.add(stage)

        assert project.dump() == expected

    @pytest.mark.parametrize(
        "stage,expected",
        (
            (
                SINGLE_STAGE,
                OrderedDict(
                    [("worker", core.LocalWorker().dump()), ("steps", [])]
                ),
            ),
            (
                MULTI_STAGES,
                OrderedDict(
                    [
                        ("worker", core.LocalWorker().dump()),
                        ("steps", [TRIGGER_STEP.dump()]),
                    ]
                ),
            ),
        ),
        ids=("single", "multiple"),
    )
    def test_stage(self, stage, expected):
        assert stage.dump() == expected

    @pytest.mark.parametrize(
        "step,expected",
        (
            (
                TRIGGER_STEP,
                OrderedDict(
                    [
                        (
                            "TriggerStages",
                            OrderedDict(
                                [
                                    ("name", "Trigger another stage"),
                                    ("stage_names", ["single-stage"]),
                                ]
                            ),
                        )
                    ]
                ),
            ),
        ),
        ids=("trigger-stages",),
    )
    def test_step(self, step, expected):
        assert step.dump() == expected

    @pytest.mark.parametrize(
        "worker,expected",
        ((core.LocalWorker(), OrderedDict([("type", "local")])),),
        ids=("local",),
    )
    def test_worker(self, worker, expected):
        assert worker.dump() == expected


class TestProject:
    def test_add(self):
        project = core.Project()

        stage = core.Stage(name="simple", worker=core.LocalWorker(), steps=[])

        project.add(stage)
        assert sum(stage.name == s.name for s in project.stages) == 1

        # Re-adding the same stage does not duplicate it
        project.add(stage)
        assert sum(stage.name == s.name for s in project.stages) == 1

        # Adding a different stage with the same name fails
        other_stage = core.Stage(
            name="simple",
            worker=core.LocalWorker(),
            steps=[core.TriggerStages("Some step", stages=[])],
        )
        with pytest.raises(ValueError, match="Cannot override stages"):
            project.add(other_stage)


class TestStep:
    class ExampleStep(core.Step):
        def dump_arguments(self):
            return []

    def test_stages(self):
        # By default, no stages
        step = self.ExampleStep("Example")
        assert step.stages == []

        # TriggerStages overrides this property
        stages = [
            core.Stage(name="example-1", worker=core.LocalWorker(), steps=[]),
            core.Stage(name="example-2", worker=core.LocalWorker(), steps=[]),
        ]
        step = core.TriggerStages("Example", stages)
        assert step.stages == stages

    @pytest.mark.parametrize(
        "value,present",
        ((None, False), (False, True), (True, True)),
        ids=("unset", "true", "false"),
    )
    @pytest.mark.parametrize(
        "arg,key",
        (("halt_on_failure", "haltOnFailure"), ("always_run", "alwaysRun")),
        ids=("halt_on_failure", "always_run"),
    )
    def test_common_args(self, arg, key, value, present):
        step = self.ExampleStep("Example", **{arg: value})
        result = step.dump()[step.step_name]

        if present:
            assert key in result
            assert result[key] == value
        else:
            assert key not in result

    def test_step_name_inheritance(self):
        # We don't set the step name in our Step sub-class
        step = self.ExampleStep("Example")
        assert step.step_name == self.ExampleStep.__qualname__
        assert self.ExampleStep.__qualname__ in step.dump()

        # We can use the `STEP_NAME` class attribute to change this
        class CustomNameStep(self.ExampleStep):
            STEP_NAME = "Custom"

        step = CustomNameStep("Example")
        assert step.step_name == "Custom"
        assert "Custom" in step.dump()
