"""Tests for the requisites of the container engine states.

The rendering tests only prove that a template can be rendered. Here we check the
requisites that keep a state from writing a version specific configuration when the
container engine of that version is not the one installed on the node (see MK8S-371).
"""

from pathlib import Path
from typing import Any, Dict, Iterator, List, Set

import pytest

from tests.unit.formulas.fixtures.rendered import RenderedStates

CONTAINERD_INSTALLED = Path("metalk8s/container-engine/containerd/installed.sls")

# Formula defining the states we depend on, it must stay in the `include` block.
REPO_FORMULA = "metalk8s.repo"

# States the containerd configuration must depend on: the package state, so the
# configuration matches the containerd actually installed, and the repository gate the
# package state itself requires.
REQUIRED_GATES = ["Install containerd", "Repositories configured"]

# States writing a version specific containerd configuration.
CONFIGURATION_STATES = ["Configure containerd", "Configure containerd registries"]


def _iter_required_ids(state_body: Dict[str, Any]) -> Iterator[str]:
    """Yield the state IDs listed in the `require` requisites of a single state."""
    for state_args in state_body.values():
        # A state declared without any argument renders as `None`.
        for state_arg in state_args or []:
            if isinstance(state_arg, dict):
                for requisite in state_arg.get("require", []):
                    yield from requisite.values()


def _required_states(states: Dict[str, Any], state_id: str) -> Set[str]:
    """List the state IDs a state depends on, following the `require` chains."""
    required: Set[str] = set()
    to_visit: List[str] = [state_id]

    while to_visit:
        for required_id in _iter_required_ids(states.get(to_visit.pop(), {})):
            if required_id not in required:
                required.add(required_id)
                to_visit.append(required_id)

    return required


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

            required_states = _required_states(states, state_id)
            for gate in REQUIRED_GATES:
                missing_gate = (
                    f"'{state_id}' does not require '{gate}', it would write a version"
                    " specific configuration for a container engine that is not the one"
                    " installed on the node"
                )
                assert gate in required_states, f"{missing_gate} ({case_id})"
