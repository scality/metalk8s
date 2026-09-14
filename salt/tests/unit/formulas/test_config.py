"""Tests for the test case configuration of the rendering tests.

The cases are parsed once into a shared structure, so reading them must leave that
structure alone. A destructive read used to drop the sub-cases of a template as soon
as a second test asked for them, which lowered the coverage of every test after the
first one without failing anything.
"""

from pathlib import Path

import pytest

from tests.unit.formulas import config

# Any template with sub-cases would do, this one has several per architecture.
TEMPLATE_WITH_SUBCASES = Path("metalk8s/orchestrate/upgrade/init.sls")


@pytest.mark.formulas
def test_cases_survive_a_second_read() -> None:
    """Check that reading the cases of a template does not consume them."""
    first_read = [case.id for case in config.get_cases(TEMPLATE_WITH_SUBCASES)]
    second_read = [case.id for case in config.get_cases(TEMPLATE_WITH_SUBCASES)]

    assert first_read, f"no test case for {TEMPLATE_WITH_SUBCASES!s}"
    assert any(
        " - " in case_id for case_id in first_read
    ), f"{TEMPLATE_WITH_SUBCASES!s} has no sub-case, it cannot cover this"
    assert first_read == second_read
