# coding: utf-8

"""Shared test setup for the buildchain unit tests."""

import sys
import unittest.mock
from pathlib import Path

# The buildchain is not an installed package: `dodo.py` imports it with
# `buildchain/` as the working directory. Mirror that here so the tests can
# run from anywhere.
sys.path.insert(0, str(Path(__file__).parent.parent))

# `buildchain.docker_command` connects to the Docker daemon at import time.
# Unit tests must not depend on a running daemon: stub the client out for the
# whole test session, before any `buildchain` module gets imported.
unittest.mock.patch("docker.from_env").start()
