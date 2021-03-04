"""Fixtures for loading data files and exposing their contents to tests."""
from pathlib import Path
from typing import Any
import sys

import pytest
import yaml

from tests.unit.formulas import paths


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
