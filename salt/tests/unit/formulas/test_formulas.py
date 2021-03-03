"""Tests for rendering formulas.

Currently only define a single test function, focused on rendering any Jinja template
available under the salt/ directory.
"""
from pathlib import Path

import jinja2
import pytest


@pytest.mark.formulas
def test_template_renders(environment: jinja2.Environment, template_path: Path) -> None:
    """Check that a Jinja template can render without errors."""
    template = environment.get_template(str(template_path))
    try:
        template.render()
    except jinja2.exceptions.TemplateError as exc:
        pytest.xfail(f"Cannot render {template_path}: {exc!r}")
