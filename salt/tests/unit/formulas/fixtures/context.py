"""Generate a rendering context from sets of options, as defined in configuration.

See the `tests.unit.formulas.options` module and the configuration file for details.
"""
from collections import namedtuple
import copy
import functools
from pathlib import Path
from typing import Any, Dict, Iterable

import pytest
import jinja2

from tests.unit.formulas import config
from tests.unit.formulas.fixtures import kubernetes
from tests.unit.formulas.fixtures.salt import SaltMock


Context = namedtuple("Context", ("id", "data"))


@pytest.fixture(scope="session", name="base_context")
def fixture_base_context(
    base_grains: Dict[str, Any],
    base_pillar: Dict[str, Any],
    base_kubernetes: kubernetes.K8sData,
) -> Dict[str, Any]:
    """Define the common basis for a rendering context.

    Do not include a SaltMock at this stage, since each data source will be replaced by
    an independent copy for each test run (to avoid side-effects when applying options).
    """
    return dict(
        grains=base_grains,
        pillar=base_pillar,
        opts={},
        __minions__={base_grains["id"]: {}},
        __kubernetes__=base_kubernetes,
    )


@pytest.fixture(name="render_contexts")
def fixture_render_contexts(
    template_path: Path,
    base_context: Dict[str, Any],
    environment: jinja2.Environment,
) -> Iterable[Context]:
    """Generate all supported contexts for a given template."""
    test_cases = config.get_cases(template_path)
    if not test_cases:
        pytest.skip(
            f"{template_path!s} has no test case configured or is explicitly skipped."
        )

    return map(
        functools.partial(
            make_context,
            dict(base_context, slspath=str(template_path.parent)),
            environment,
        ),
        test_cases,
    )


def make_context(
    base: Dict[str, Any],
    environment: jinja2.Environment,
    test_case: config.TestCase,
) -> Context:
    """Prepare a rendering context for a set of option values.

    Ensures each rendering pass will get a fresh copy of all fixtures, by copying all
    the initial (shared) context data, and linking the context members with a SaltMock
    instance after having applied all options (in case they remove or replace some of
    the context).
    """
    context_data = copy.deepcopy(base)
    config_overrides = {}

    for option in sorted(test_case.options, key=lambda o: o.PRIORITY, reverse=True):
        option.update_context(context_data)
        if isinstance(option, config.MinionState):
            config_overrides.update(option.config_overrides)

    context_data["salt"] = SaltMock(
        environment=environment,
        grains=context_data["grains"],
        pillar=context_data["pillar"],
        opts=context_data["opts"],
        minions=context_data.pop("__minions__"),
        k8s_data=context_data.pop("__kubernetes__"),
        config=config_overrides,
    )

    return Context(id=test_case.id, data=context_data)
