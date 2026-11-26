"""Tests for the `check_minion_id` function of the `common.sh.in` script."""

import subprocess
from pathlib import Path

import pytest

COMMON_SH = Path(__file__).resolve().parents[4] / "scripts" / "common.sh.in"


def _check_minion_id(minion_id):
    script = f"""
        set -e
        source "{COMMON_SH}"
        get_salt_minion_id() {{ echo "{minion_id}"; }}
        check_minion_id
    """
    return subprocess.run(
        ["bash", "-c", script], capture_output=True, text=True, check=False
    )


@pytest.mark.parametrize(
    "minion_id",
    ["bootstrap", "a", "node-1.example.com", "a" * 52],
)
def test_valid_minion_id(minion_id):
    """IDs that fit in a 64 characters Common Name are accepted."""
    assert _check_minion_id(minion_id).returncode == 0


@pytest.mark.parametrize("length", [53, 100, 253])
def test_too_long_minion_id(length):
    """IDs longer than 52 characters (CN > 64 characters) are rejected."""
    result = _check_minion_id("a" * length)
    assert result.returncode != 0
    assert "no more than 52" in result.stdout


def test_invalid_rfc1123_minion_id():
    """The existing RFC1123 check still applies."""
    assert _check_minion_id("Bad_ID").returncode != 0
