"""Expose a `rendered_states` fixture, parsing the states declared by an SLS template.

Tests asserting on the content of a rendered SLS, such as the requisites between its
states, get the parsed documents from here instead of rendering the template themselves.
"""

from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Set, Tuple

import jinja2
import pytest
import salt.utils.yaml  # type: ignore

from tests.unit.formulas.fixtures.context import Context

# Test case ID, and the states parsed from the SLS rendered with that case.
RenderedStates = List[Tuple[str, Dict[str, Any]]]


@pytest.fixture(name="rendered_states")
def fixture_rendered_states(
    environment: jinja2.Environment,
    render_contexts: Iterable[Context],
    template_path: Path,
) -> RenderedStates:
    """Parse the states of a template, once per supported rendering context."""
    template = environment.get_template(str(template_path))

    # NOTE: We parse with the Salt loader rather than PyYAML, so that we reject what
    # Salt itself rejects, a duplicated state ID for instance.
    return [
        (context.id, salt.utils.yaml.safe_load(template.render(**context.data)))
        for context in render_contexts
    ]


def _iter_required_ids(state_body: Dict[str, Any]) -> Iterator[str]:
    """Yield the state IDs listed in the `require` requisites of a single state."""
    for state_args in state_body.values():
        # A state declared without any argument renders as `None`.
        for state_arg in state_args or []:
            if isinstance(state_arg, dict):
                for requisite in state_arg.get("require", []):
                    yield from requisite.values()


def required_states(states: Dict[str, Any], state_id: str) -> Set[str]:
    """List the state IDs a state depends on, following the `require` chains."""
    required: Set[str] = set()
    to_visit: List[str] = [state_id]

    while to_visit:
        for required_id in _iter_required_ids(states.get(to_visit.pop(), {})):
            if required_id not in required:
                required.add(required_id)
                to_visit.append(required_id)

    return required
