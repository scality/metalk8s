"""Tests for rendering formulas.

Currently only define a single test function, focused on rendering any Jinja template
available under the salt/ directory.
"""

import pytest


@pytest.mark.formulas
def test_template_renders() -> None:
    """Check that a Jinja template can render without errors."""
    pytest.fail("Test not implemented yet.")
