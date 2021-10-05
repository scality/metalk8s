"""Check constants in the `lib_alert_tree` package root."""

from lib_alert_tree import __version__


def test_version():
    """Check the hard-coded version."""
    assert __version__ == "0.1.0"
