"""Expose constant paths for use in tests and fixture definitions."""

from pathlib import Path

# <root>/salt/tests/unit/formulas
BASE_DIR = Path(__file__).parent.resolve()

# <root>/salt/tests/unit/formulas/data
DATA_DIR = BASE_DIR / "data"

# <root>
REPO_ROOT = (BASE_DIR / "../../../../").resolve()

# <root>/salt
SALT_DIR = REPO_ROOT / "salt"
