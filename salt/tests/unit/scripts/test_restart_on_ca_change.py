"""Tests for the restart-on-ca-change.py script."""

import importlib.util
import os
import tempfile
from pathlib import Path

import requests
from unittest import TestCase
from unittest.mock import patch

# The script has a hyphenated filename, so we need importlib to load it
_SCRIPT_PATH = (
    Path(__file__).resolve().parents[3]
    / "metalk8s"
    / "addons"
    / "prometheus-operator"
    / "deployed"
    / "files"
    / "restart-on-ca-change.py"
)
_spec = importlib.util.spec_from_file_location("restart_on_ca_change", _SCRIPT_PATH)
restart_on_ca_change = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(restart_on_ca_change)

ENV_VARS = {
    "CA_DIR": "/tmp/secrets",
    "CA_FILE_NAME": "ca.crt",
    "DEPLOYMENT_NAMESPACE": "metalk8s-monitoring",
    "DEPLOYMENT_NAME": "oauth2-proxy-prometheus",
}


class TestHashFile(TestCase):
    """Tests for hash_file function."""

    def test_returns_sha256_hex(self):
        """hash_file returns a 64-char hex string."""
        with tempfile.NamedTemporaryFile() as f:
            f.write(b"cert-data")
            f.flush()
            result = restart_on_ca_change.hash_file(Path(f.name))
        self.assertIsInstance(result, str)
        self.assertEqual(len(result), 64)

    def test_different_content_different_hash(self):
        """hash_file returns different hashes for different file contents."""
        with tempfile.NamedTemporaryFile() as f1, tempfile.NamedTemporaryFile() as f2:
            f1.write(b"cert-v1")
            f1.flush()
            hash_v1 = restart_on_ca_change.hash_file(Path(f1.name))

            f2.write(b"cert-v2")
            f2.flush()
            hash_v2 = restart_on_ca_change.hash_file(Path(f2.name))

        self.assertNotEqual(hash_v1, hash_v2)

    def test_same_content_same_hash(self):
        """hash_file returns the same hash for the same content."""
        with tempfile.NamedTemporaryFile() as f1, tempfile.NamedTemporaryFile() as f2:
            f1.write(b"cert-data")
            f1.flush()
            hash_1 = restart_on_ca_change.hash_file(Path(f1.name))

            f2.write(b"cert-data")
            f2.flush()
            hash_2 = restart_on_ca_change.hash_file(Path(f2.name))

        self.assertEqual(hash_1, hash_2)


@patch.dict(os.environ, ENV_VARS)
class TestMain(TestCase):
    """Tests for main function."""

    def test_ca_file_missing_skips(self):
        """main skips when CA file does not exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            env = {**ENV_VARS, "CA_DIR": tmpdir}
            with patch.dict(os.environ, env), patch("builtins.print") as mock_print:
                restart_on_ca_change.main()
            mock_print.assert_called_once_with(
                f"CA file {Path(tmpdir) / 'ca.crt'} does not exist, skipping"
            )

    def test_initial_load_skips_restart(self):
        """main writes hash and skips restart on initial load."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ca_file = Path(tmpdir) / "ca.crt"
            ca_file.write_bytes(b"cert-data")
            env = {**ENV_VARS, "CA_DIR": tmpdir}
            with patch.dict(os.environ, env), patch("builtins.print") as mock_print:
                restart_on_ca_change.main()
            mock_print.assert_called_once_with("Initial CA load, skipping restart")
            # Hash file should have been created
            hash_file = Path(tmpdir) / ".ca-hash-previous"
            self.assertTrue(hash_file.exists())

    def test_unchanged_hash_no_restart(self):
        """main does nothing when hash has not changed."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ca_file = Path(tmpdir) / "ca.crt"
            ca_file.write_bytes(b"cert-data")
            # Pre-compute and write the hash
            current_hash = restart_on_ca_change.hash_file(ca_file)
            hash_file = Path(tmpdir) / ".ca-hash-previous"
            hash_file.write_text(current_hash)
            env = {**ENV_VARS, "CA_DIR": tmpdir}
            with patch.dict(os.environ, env), patch("builtins.print") as mock_print:
                restart_on_ca_change.main()
            mock_print.assert_not_called()

    @patch.object(restart_on_ca_change, "trigger_restart")
    def test_changed_hash_triggers_restart(self, mock_restart):
        """main triggers restart when hash has changed."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ca_file = Path(tmpdir) / "ca.crt"
            ca_file.write_bytes(b"cert-data")
            hash_file = Path(tmpdir) / ".ca-hash-previous"
            hash_file.write_text("old-hash")
            env = {**ENV_VARS, "CA_DIR": tmpdir}
            with patch.dict(os.environ, env), patch("builtins.print") as mock_print:
                restart_on_ca_change.main()

        mock_restart.assert_called_once_with(
            "metalk8s-monitoring", "oauth2-proxy-prometheus"
        )
        self.assertIn(
            "Rolling restart triggered",
            mock_print.call_args[0][0],
        )

    @patch.object(
        restart_on_ca_change,
        "trigger_restart",
        side_effect=requests.RequestException("refused"),
    )
    def test_api_failure_exits_with_error(self, _mock_restart):
        """main exits with code 1 when the API call fails."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ca_file = Path(tmpdir) / "ca.crt"
            ca_file.write_bytes(b"cert-data")
            hash_file = Path(tmpdir) / ".ca-hash-previous"
            hash_file.write_text("old-hash")
            env = {**ENV_VARS, "CA_DIR": tmpdir}
            with patch.dict(os.environ, env), patch("builtins.print"):
                with self.assertRaises(SystemExit) as ctx:
                    restart_on_ca_change.main()

        self.assertEqual(ctx.exception.code, 1)

    @patch.object(
        restart_on_ca_change,
        "trigger_restart",
        side_effect=requests.RequestException("refused"),
    )
    def test_hash_not_persisted_on_api_failure(self, _mock_restart):
        """Hash file is not updated when the API call fails."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ca_file = Path(tmpdir) / "ca.crt"
            ca_file.write_bytes(b"cert-data")
            hash_file = Path(tmpdir) / ".ca-hash-previous"
            hash_file.write_text("old-hash")
            env = {**ENV_VARS, "CA_DIR": tmpdir}
            with patch.dict(os.environ, env), patch("builtins.print"):
                try:
                    restart_on_ca_change.main()
                except SystemExit:
                    pass

            # Hash file should still contain the old hash
            self.assertEqual(hash_file.read_text(), "old-hash")


class TestTriggerRestart(TestCase):
    """Tests for trigger_restart function."""

    @patch.object(restart_on_ca_change.requests, "patch")
    def test_sends_patch_request(self, mock_patch):
        """trigger_restart sends a PATCH to the K8s API."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".token") as f:
            f.write("fake-token")
            f.flush()
            with patch.object(restart_on_ca_change, "SA_TOKEN", Path(f.name)):
                restart_on_ca_change.trigger_restart(
                    "metalk8s-monitoring", "oauth2-proxy-prometheus"
                )

        mock_patch.assert_called_once()
        args, kwargs = mock_patch.call_args
        self.assertIn(
            "/namespaces/metalk8s-monitoring/deployments/oauth2-proxy-prometheus",
            args[0],
        )
        self.assertEqual(
            kwargs["headers"]["Content-Type"],
            "application/strategic-merge-patch+json",
        )
        self.assertIn(
            "Bearer fake-token",
            kwargs["headers"]["Authorization"],
        )
