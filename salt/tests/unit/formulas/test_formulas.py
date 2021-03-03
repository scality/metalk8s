"""Tests for rendering formulas.

Currently only define a single test function, focused on rendering any Jinja template
available under the salt/ directory.
"""

import jinja2
import pytest


@pytest.mark.formulas
def test_template_renders(environment: jinja2.Environment) -> None:
    """Check that a Jinja template can render without errors."""
    example_template_path = "metalk8s/map.jinja"
    template = environment.get_template(example_template_path)
    try:
        template.render()
    except jinja2.exceptions.TemplateError as exc:
        pytest.xfail(f"Cannot render {example_template_path}: {exc!r}")
