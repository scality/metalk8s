"""Expose a `template_path` parameterized fixture to list all "testable" templates.

This will list all files with one of the extensions in `TEMPLATE_EXTS`, filtering out
directories listed in `EXCLUDE_DIRS`.
"""
from pathlib import Path
from typing import List, Optional

import pytest

from tests.unit.formulas import paths


TEMPLATE_EXTS = ["sls", "sls.in", "j2", "j2.in", "jinja"]
EXCLUDE_DIRS = [  # relative to paths.SALT_DIR
    "tests",
    "_auth",
    "_beacons",
    "_modules",
    "_pillar",
    "_renderers",
    "_roster",
    "_runners",
    "_states",
    "_utils",
]


def _filter_path(path: Path) -> Optional[Path]:
    if not path.is_file():
        return None

    path = path.relative_to(paths.SALT_DIR)

    for exclude in EXCLUDE_DIRS:
        try:
            path.relative_to(exclude)
        except ValueError:
            continue
        else:
            return None

    return path


def list_templates() -> List[Path]:
    """List all template files to validate in rendering tests."""
    templates: List[Path] = []
    for ext in TEMPLATE_EXTS:
        templates.extend(
            path
            for path in map(_filter_path, paths.SALT_DIR.glob(f"**/*.{ext}"))
            if path is not None
        )
    return templates


@pytest.fixture(name="template_path", params=list_templates(), ids=str)
def fixture_template_path(request: pytest.FixtureRequest) -> Path:
    """Yields template paths from the return of `list_templates`."""
    param: Optional[Path] = getattr(request, "param", None)
    assert (
        param is not None
    ), "The `template_path` fixture must be indirectly parametrized"
    return param
