"""Tests for the restart-on-ca-change.py script."""

import importlib.util
import os

import requests
from unittest import TestCase
from unittest.mock import mock_open, patch

# The script has a hyphenated filename, so we need importlib to load it
_SCRIPT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    os.pardir,
    os.pardir,
    os.pardir,
    "metalk8s",
    "addons",
    "prometheus-operator",
    "deployed",
    "files",
    "restart-on-ca-change.py",
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
        with patch("builtins.open", mock_open(read_data=b"cert-data")):
            result = restart_on_ca_change.hash_file("/tmp/secrets/ca.crt")
        self.assertIsInstance(result, str)
        self.assertEqual(len(result), 64)

    def test_different_content_different_hash(self):
        """hash_file returns different hashes for different file contents."""
        with patch("builtins.open", mock_open(read_data=b"cert-v1")):
            hash_v1 = restart_on_ca_change.hash_file("/tmp/secrets/ca.crt")

        with patch("builtins.open", mock_open(read_data=b"cert-v2")):
            hash_v2 = restart_on_ca_change.hash_file("/tmp/secrets/ca.crt")

        self.assertNotEqual(hash_v1, hash_v2)

    def test_same_content_same_hash(self):
        """hash_file returns the same hash for the same content."""
        with patch("builtins.open", mock_open(read_data=b"cert-data")):
            hash_1 = restart_on_ca_change.hash_file("/tmp/secrets/ca.crt")

        with patch("builtins.open", mock_open(read_data=b"cert-data")):
            hash_2 = restart_on_ca_change.hash_file("/tmp/secrets/ca.crt")

        self.assertEqual(hash_1, hash_2)


@patch.dict(os.environ, ENV_VARS)
class TestMain(TestCase):
    """Tests for main function."""

    @patch("os.path.exists", return_value=False)
    def test_ca_file_missing_skips(self, _mock_exists):
        """main skips when CA file does not exist."""
        with patch("builtins.print") as mock_print:
            restart_on_ca_change.main()
        mock_print.assert_called_once_with(
            "CA file /tmp/secrets/ca.crt does not exist, skipping"
        )

    def test_initial_load_skips_restart(self):
        """main writes hash and skips restart on initial load."""
        # ca_file exists, hash_file_path does not
        with patch(
            "os.path.exists", side_effect=lambda p: p == "/tmp/secrets/ca.crt"
        ), patch.object(
            restart_on_ca_change, "hash_file", return_value="abc123"
        ), patch(
            "builtins.open", mock_open()
        ), patch(
            "builtins.print"
        ) as mock_print:
            restart_on_ca_change.main()
        mock_print.assert_called_once_with("Initial CA load, skipping restart")

    def test_unchanged_hash_no_restart(self):
        """main does nothing when hash has not changed."""
        with patch("os.path.exists", return_value=True), patch.object(
            restart_on_ca_change, "hash_file", return_value="same-hash"
        ), patch("builtins.open", mock_open(read_data="same-hash")), patch(
            "builtins.print"
        ) as mock_print:
            restart_on_ca_change.main()
        mock_print.assert_not_called()

    @patch.object(restart_on_ca_change, "trigger_restart")
    def test_changed_hash_triggers_restart(self, mock_restart):
        """main triggers restart when hash has changed."""
        with patch("os.path.exists", return_value=True), patch.object(
            restart_on_ca_change, "hash_file", return_value="new-hash"
        ), patch("builtins.open", mock_open(read_data="old-hash")), patch(
            "builtins.print"
        ) as mock_print:
            restart_on_ca_change.main()

        mock_restart.assert_called_once_with(
            "metalk8s-monitoring", "oauth2-proxy-prometheus"
        )
        self.assertIn(
            "Rolling restart triggered",
            mock_print.call_args[0][0],
        )

    @patch("builtins.print")
    @patch.object(
        restart_on_ca_change,
        "trigger_restart",
        side_effect=requests.RequestException("refused"),
    )
    @patch.object(restart_on_ca_change, "hash_file", return_value="new-hash")
    @patch("os.path.exists", return_value=True)
    def test_api_failure_exits_with_error(
        self, _mock_exists, _mock_hash, _mock_restart, _mock_print
    ):
        """main exits with code 1 when the API call fails."""
        with patch("builtins.open", mock_open(read_data="old-hash")):
            with self.assertRaises(SystemExit) as ctx:
                restart_on_ca_change.main()

        self.assertEqual(ctx.exception.code, 1)

    @patch("builtins.print")
    @patch.object(
        restart_on_ca_change,
        "trigger_restart",
        side_effect=requests.RequestException("refused"),
    )
    @patch.object(restart_on_ca_change, "hash_file", return_value="new-hash")
    @patch("os.path.exists", return_value=True)
    def test_hash_not_persisted_on_api_failure(
        self, _mock_exists, _mock_hash, _mock_restart, _mock_print
    ):
        """Hash file is not updated when the API call fails."""
        mock_file = mock_open(read_data="old-hash")

        with patch("builtins.open", mock_file):
            try:
                restart_on_ca_change.main()
            except SystemExit:
                pass

        # Only the hash file read should have happened, no write
        write_calls = mock_file().write.call_args_list
        self.assertEqual(len(write_calls), 0)


class TestTriggerRestart(TestCase):
    """Tests for trigger_restart function."""

    @patch.object(restart_on_ca_change.requests, "patch")
    @patch(
        "builtins.open",
        mock_open(read_data="fake-token"),
    )
    def test_sends_patch_request(self, mock_patch):
        """trigger_restart sends a PATCH to the K8s API."""
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
