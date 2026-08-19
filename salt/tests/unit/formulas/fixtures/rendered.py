"""Expose a `rendered_states` fixture, parsing the states declared by an SLS template.

Tests asserting on the content of a rendered SLS, such as the requisites between its
states, get the parsed documents from here instead of rendering the template themselves.
"""

from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

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
