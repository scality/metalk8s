"""Fixtures for loading data files and exposing their contents to tests."""
from pathlib import Path
from typing import Any
import sys
import textwrap

import pytest
import yaml

from tests.unit.formulas import paths
from tests.unit.formulas.fixtures import kubernetes


def _load_yaml_data(path: Path) -> Any:
    with path.open("r") as file_handle:
        return yaml.safe_load(file_handle)


@pytest.fixture(scope="session", name="base_grains")
def fixture_base_grains() -> Any:
    """Example set of grains found on a CentOS 7 minion running MetalK8s 2.7."""
    return _load_yaml_data(paths.DATA_DIR / "base_grains.yaml")


@pytest.fixture(scope="session", name="base_pillar")
def fixture_base_pillar() -> Any:
    """Example pillar data retrieved from a MetalK8s 2.7.1 bootstrap minion."""
    return _load_yaml_data(paths.DATA_DIR / "base_pillar.yaml")


@pytest.fixture(scope="session", name="metalk8s_versions")
def fixture_metalk8s_versions() -> Any:
    """Read the expected contents of "metalk8s/versions.json" from the buildchain."""
    buildchain_path = paths.REPO_ROOT / "buildchain"
    sys.path.insert(0, str(buildchain_path))
    # pylint: disable=import-error,import-outside-toplevel
    from buildchain import versions  # type: ignore

    # pylint: enable=import-error,import-outside-toplevel

    sys.path.pop(0)
    return versions.SALT_VERSIONS_JSON


@pytest.fixture(scope="session", name="buildchain_template_context")
def fixture_buildchain_template_context() -> Any:
    """Emulate .in template context for buildchain."""
    buildchain_path = paths.REPO_ROOT / "buildchain"
    sys.path.insert(0, str(buildchain_path))
    # pylint: disable=import-error,import-outside-toplevel
    from buildchain import versions

    # pylint: enable=import-error,import-outside-toplevel

    sys.path.pop(0)
    ui_theme_options: Path = paths.REPO_ROOT / "shell-ui" / "theme.json"
    return {
        "VERSION": versions.VERSION,
        "ThemeConfig": textwrap.indent(
            ui_theme_options.read_text(encoding="utf-8"), 4 * " "
        ),
    }


@pytest.fixture(scope="session", name="base_kubernetes")
def fixture_base_kubernetes() -> kubernetes.K8sData:
    """Return a basic dataset for mocking Kubernetes API.

    This is not directly exposed as part of the rendering context, but is attached
    in a SaltMock instance for providing data to the metalk8s_kubernetes mocks.
    """
    base_file = paths.DATA_DIR / "kubernetes/base.yaml"
    with base_file.open("r") as handle:
        list_objects = list(yaml.safe_load_all(handle))

    result: kubernetes.K8sData = {}
    for list_object in list_objects:
        api_group = result.setdefault(list_object["apiVersion"], {})
        api_group[list_object["objectKind"]] = list_object["items"]

    return result
