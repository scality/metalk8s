import pytest

from buildplan import core
from buildplan import shell
from buildplan.dsl import remote


def _single_step_factory():
    return shell.Shell("Step", "exit 0")


def _multiple_steps_factory():
    for name in ["Step 1", "Step 2", "Step 3"]:
        yield shell.Shell(name, "exit 0")


@pytest.mark.parametrize(
    "step_factory", [_single_step_factory, _multiple_steps_factory]
)
def test_host_marker_nominal(step_factory):
    decorated_factory = remote.mark_remote_host(host="_host")(step_factory)
    decorated_steps = decorated_factory()
    for step in decorated_steps:
        assert step.__remote_host == "_host"


def test_host_marker_error():
    with pytest.raises(ValueError, match="received: something invalid."):
        remote.mark_remote_host("something invalid")
