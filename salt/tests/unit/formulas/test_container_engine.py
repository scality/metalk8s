"""Tests for the requisites of the container engine states.

The rendering tests only prove that a template can be rendered. Here we check the
requisites that keep a state from writing a version specific configuration when the
container engine of that version is not the one installed on the node (see MK8S-371).
"""

from pathlib import Path

import pytest

from tests.unit.formulas.fixtures.rendered import RenderedStates, required_states

CONTAINERD_INSTALLED = Path("metalk8s/container-engine/containerd/installed.sls")

# Formula defining the states we depend on, it must stay in the `include` block.
REPO_FORMULA = "metalk8s.repo"

# States the containerd configuration must depend on: the package state, so the
# configuration matches the containerd actually installed, and the repository gate the
# package state itself requires.
REQUIRED_GATES = ["Install containerd", "Repositories configured"]

# States writing a version specific containerd configuration.
CONFIGURATION_STATES = ["Configure containerd", "Configure containerd registries"]


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [CONTAINERD_INSTALLED], indirect=True)
def test_containerd_configuration_requires_the_package(
    rendered_states: RenderedStates,
) -> None:
    """Check the containerd configuration is only written along with its package."""
    for case_id, states in rendered_states:
        assert REPO_FORMULA in states.get(
            "include", []
        ), f"'{REPO_FORMULA}' is not included, the gates cannot resolve ({case_id})"

        for state_id in CONFIGURATION_STATES:
            assert state_id in states, f"no '{state_id}' state ({case_id})"

            gates = required_states(states, state_id)
            for gate in REQUIRED_GATES:
                missing_gate = (
                    f"'{state_id}' does not require '{gate}', it would write a version"
                    " specific configuration for a container engine that is not the one"
                    " installed on the node"
                )
                assert gate in gates, f"{missing_gate} ({case_id})"
