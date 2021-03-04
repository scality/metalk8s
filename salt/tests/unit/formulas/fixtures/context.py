"""Generate a rendering context from sets of options, as defined in configuration.

See the `tests.unit.formulas.options` module and the configuration file for details.
"""
from collections import namedtuple
import functools
from pathlib import Path
from typing import Any, Dict, Iterable

import pytest
import jinja2

from tests.unit.formulas import config
from tests.unit.formulas.fixtures.salt import SaltMock


Context = namedtuple("Context", ("options", "data"))


@pytest.fixture(scope="session", name="base_context")
def fixture_base_context(
    environment: jinja2.Environment,
    base_grains: Dict[str, Any],
    base_pillar: Dict[str, Any],
    base_kubernetes: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    """Define the common basis for a rendering context."""
    return dict(
        grains=base_grains,
        pillar=base_pillar,
        salt=SaltMock(
            environment=environment,
            grains=base_grains,
            pillar=base_pillar,
            k8s_data=base_kubernetes,
        ),
    )


@pytest.fixture(name="render_contexts")
def fixture_render_contexts(
    template_path: Path, base_context: Dict[str, Any]
) -> Iterable[Context]:
    """Generate all supported contexts for a given template."""
    options = config.get_options(template_path)
    if options is None:
        pytest.skip(f"{template_path!s} is configured to be skipped.")

    # Adding this here since it derives from the template path
    base_context["slspath"] = str(template_path.parent)
    return map(
        functools.partial(make_context, base_context),
        config.generate_option_combinations(options),
    )


def make_context(base: Dict[str, Any], options: config.OptionSet) -> Context:
    """Prepare a rendering context for a set of option values."""
    context_data = base.copy()

    for option in options:
        option.update_context(context_data)

    return Context(options=options, data=context_data)
