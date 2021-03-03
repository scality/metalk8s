"""Fixtures for loading data files and exposing their contents to tests."""
from pathlib import Path
from typing import Any

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
