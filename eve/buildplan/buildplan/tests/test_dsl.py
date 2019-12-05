from buildplan import core
from buildplan import dsl


class TestStageDecorators:
    @staticmethod
    def stage_factory():
        return core.Stage("example", worker=core.LocalWorker(), steps=[])

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
        assert len(decorated_stage.steps) == 3
