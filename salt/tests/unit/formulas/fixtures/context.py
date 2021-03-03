"""Generate a rendering context from sets of options, as defined in configuration.

See the `tests.unit.formulas.options` module and the configuration file for details.
"""
from collections import namedtuple
from pathlib import Path
from typing import Any, Dict, Iterable

import pytest

from tests.unit.formulas import config


Context = namedtuple("Context", ("id", "data"))


@pytest.fixture(name="render_contexts")
def fixture_render_contexts(template_path: Path) -> Iterable[Context]:
    """Generate all supported contexts for a given template."""
    options = config.get_options(template_path)
    if options is None:
        pytest.skip(f"{template_path!s} is configured to be skipped.")

    return map(make_context, config.generate_option_combinations(options))


def make_context(options: config.OptionSet) -> Context:
    """Prepare a rendering context for a set of option values."""
    context_data: Dict[str, Any] = {}

    for option in options:
        option.update_context(context_data)

    return Context(id="-".join(map(repr, options)), data=context_data)
