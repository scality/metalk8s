"""Fixtures for setting up a Jinja rendering environment."""
import json
from typing import Any, Callable, Dict, Tuple

import jinja2
import pytest
from salt.utils.decorators.jinja import (  # type: ignore
    JinjaFilter,
    JinjaGlobal,
    JinjaTest,
)
import salt.utils.jinja  # type: ignore

from tests.unit.formulas import paths


class MockedFSLoader(jinja2.FileSystemLoader):
    """A FilesystemLoader with overrides for arbitrary templates."""

    def __init__(self, directory: str, mock_templates: Dict[str, str]):
        super().__init__(directory)
        self._mock_templates = mock_templates

    def get_source(
        self, environment: jinja2.Environment, template: str
    ) -> Tuple[str, str, Callable[..., Any]]:
        mock_template = self._mock_templates.get(template)
        if mock_template is not None:
            return mock_template, template, lambda: None
        return super().get_source(environment, template)


@pytest.fixture(scope="session", name="template_loader")
def fixture_template_loader(metalk8s_versions: Any) -> jinja2.FileSystemLoader:
    """Load templates using the salt/ directory as a root."""
    mock_templates = {
        "metalk8s/versions.json": json.dumps(metalk8s_versions),
    }
    return MockedFSLoader(str(paths.SALT_DIR), mock_templates)


@pytest.fixture(scope="session", name="environment")
def fixture_environment(template_loader: jinja2.BaseLoader) -> jinja2.Environment:
    """Setup an environment similar to what Salt does.

    See https://github.com/saltstack/salt/blob/master/salt/utils/templates.py#L406-L476
    """
    env = jinja2.Environment(
        loader=template_loader,
        extensions=[
            "jinja2.ext.do",
            "jinja2.ext.with_",
            "jinja2.ext.loopcontrols",
            salt.utils.jinja.SerializerExtension,
        ],
        # Enforce variables to be defined, so we really test the rendering
        undefined=jinja2.StrictUndefined,
    )

    # Custom tests
    env.tests.update(JinjaTest.salt_jinja_tests)

    # Custom filters (prevent overrides for `tojson` and `indent`)
    tojson_filter = env.filters.get("tojson")
    indent_filter = env.filters.get("indent")
    env.filters.update(JinjaFilter.salt_jinja_filters)
    env.filters["tojson"] = tojson_filter
    env.filters["indent"] = indent_filter

    # Custom globals
    env.globals.update(JinjaGlobal.salt_jinja_globals)

    return env
