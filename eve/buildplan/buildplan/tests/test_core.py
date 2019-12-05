from collections import OrderedDict

import pytest

from buildplan import core


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


class TestStage:
    def test_dump(self):
        stage = core.Stage(
            name="single-stage", worker=core.LocalWorker(), steps=[]
        )
        expected = OrderedDict(
            [("worker", core.LocalWorker().dump()), ("steps", [])]
        )
        assert stage.dump() == expected

    @pytest.mark.parametrize(
        "worker,expected",
        (
            (core.LocalWorker(), OrderedDict([("type", "local")])),
            (
                core.KubePodWorker(
                    path="_path",
                    images=[
                        core.KubePodWorker.Image(
                            name="_image", context="_context"
                        )
                    ],
                ),
                OrderedDict(
                    [
                        ("type", "kube_pod"),
                        ("path", "_path"),
                        ("images", OrderedDict([("_image", "_context")])),
                    ]
                ),
            ),
            (
                core.KubePodWorker(
                    path="_path",
                    images=[
                        core.KubePodWorker.Image(
                            name="_image",
                            context="_context",
                            dockerfile="_dockerfile",
                        )
                    ],
                ),
                OrderedDict(
                    [
                        ("type", "kube_pod"),
                        ("path", "_path"),
                        (
                            "images",
                            OrderedDict(
                                [
                                    (
                                        "_image",
                                        OrderedDict(
                                            [
                                                ("context", "_context"),
                                                ("dockerfile", "_dockerfile"),
                                            ]
                                        ),
                                    )
                                ]
                            ),
                        ),
                    ]
                ),
            ),
            (
                core.OpenStackWorker(
                    path="_path",
                    image=core.OpenStackWorker.Image.CENTOS7,
                    flavor=core.OpenStackWorker.Flavor.SMALL,
                ),
                OrderedDict(
                    [
                        ("type", "openstack"),
                        ("path", "_path"),
                        ("image", core.OpenStackWorker.Image.CENTOS7.value),
                        ("flavor", core.OpenStackWorker.Flavor.SMALL.value),
                    ]
                ),
            ),
        ),
        ids=(
            "local",
            "kube-pod-no-dockerfile",
            "kube-pod-with-dockerfile",
            "openstack",
        ),
    )
    def test_worker(self, worker, expected):
        assert worker.dump() == expected


class TestProject:
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
    def test_dump(self, stage, expected):
        project = core.Project()

        if stage is not None:
            project.add(stage)

        assert project.dump() == expected

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

    @pytest.mark.parametrize(
        "key,name,value,present",
        (
            ("halt_on_failure", "haltOnFailure", None, False),
            ("halt_on_failure", "haltOnFailure", True, True),
            ("unknown", "whatever", "some-value", False),
        ),
        ids=("known-set", "known-unset", "unknown"),
    )
    def test_optional_args(self, key, name, value, present):
        step = self.ExampleStep("Example", **{key: value})
        result = step.dump()[step.step_name]

        if present:
            assert name in result
            assert result[name] == value
        else:
            assert name not in result

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


class TestSetPropertyFromCommand:
    def test_dump(self):
        step = core.SetPropertyFromCommand(
            name="_name", property_name="_property", command="_command"
        )
        expected = {
            "SetPropertyFromCommand": OrderedDict(
                [
                    ("name", "_name"),
                    ("property", "_property"),
                    ("command", "_command"),
                ]
            ),
        }
        assert step.dump() == expected


class TestShellCommand:
    @pytest.mark.parametrize(
        "kwargs,expected_args",
        (({}, []), (dict(sigterm_time=600), [("sigtermTime", 600)]),),
    )
    def test_dump(self, kwargs, expected_args):
        step = core.ShellCommand(name="_name", command="_command", **kwargs)
        expected = {
            "ShellCommand": OrderedDict(
                [("name", "_name"), ("command", "_command"), *expected_args,]
            ),
        }
        assert step.dump() == expected


class TestTriggerStages:
    def test_dump(self):
        step = core.TriggerStages(
            "Trigger another stage", stages=[SINGLE_STAGE]
        )
        expected = {
            "TriggerStages": OrderedDict(
                [
                    ("name", "Trigger another stage"),
                    ("stage_names", [SINGLE_STAGE.name]),
                ]
            ),
        }
        assert step.dump() == expected

    def test_stages(self):
        # TriggerStages overrides the `stages` property
        stages = [
            core.Stage(name="example-1", worker=core.LocalWorker(), steps=[]),
            core.Stage(name="example-2", worker=core.LocalWorker(), steps=[]),
        ]
        step = core.TriggerStages("Example", stages)
        assert step.stages == stages


class TestUpload:
    def test_dump(self):
        step = core.Upload("_name", source="_source",)
        expected = {
            "Upload": OrderedDict([("name", "_name"), ("source", "_source"),]),
        }
        assert step.dump() == expected
