"""Tests for the requisites of the image cache states.

The rendering tests only prove that a template can be rendered. Here we check the
ordering the `containerd-image-preload` timer needs: it fires as soon as it is
started, and the import it runs goes into a containerd that must already be up.
"""

from pathlib import Path

import pytest

from tests.unit.formulas.fixtures.rendered import RenderedStates, required_states

IMAGE_CACHE_INSTALLED = Path("metalk8s/image-cache/installed.sls")

# Formulas defining the states we depend on, they must stay in the `include` block.
REQUIRED_FORMULAS = [
    "metalk8s.repo",
    "metalk8s.container-engine.containerd.installed",
    "metalk8s.container-engine.containerd.running",
]

TIMER_STATE = "Ensure containerd image preload timer running"

# What the formula renders instead when the node runs no containerd.
NO_ENGINE_STATE = "No containerd to preload images into"

# States the timer must depend on: its own package, the containerd package the
# preload script needs, and the readiness check on the running engine.
REQUIRED_GATES = [
    "Install containerd image preload",
    "Install containerd",
    "Ensure containerd is ready",
    "Repositories configured",
]


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_INSTALLED], indirect=True)
def test_preload_timer_requires_a_running_containerd(
    rendered_states: RenderedStates,
) -> None:
    """Check the preload timer only starts once containerd is installed and ready."""
    checked = False

    for case_id, states in rendered_states:
        if TIMER_STATE not in states:
            # Nothing to preload into, the formula must not pull containerd in.
            assert (
                NO_ENGINE_STATE in states
            ), f"no '{NO_ENGINE_STATE}' state ({case_id})"
            assert "include" not in states, f"unexpected includes ({case_id})"
            continue

        includes = states.get("include", [])
        for formula in REQUIRED_FORMULAS:
            assert (
                formula in includes
            ), f"'{formula}' is not included, the gates cannot resolve ({case_id})"

        gates = required_states(states, TIMER_STATE)
        for gate in REQUIRED_GATES:
            missing_gate = (
                f"'{TIMER_STATE}' does not require '{gate}', the timer could fire"
                " before containerd can serve the import"
            )
            assert gate in gates, f"{missing_gate} ({case_id})"

        checked = True

    assert (
        checked
    ), "no rendering case installs the timer, the requisites went unchecked"
