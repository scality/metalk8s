"""Tests for the restart-on-ca-change.py script."""

import importlib.util
import os
import os.path
import urllib.error
from unittest import TestCase
from unittest.mock import mock_open, patch

# The script has a hyphenated filename, so we need importlib to load it
_SCRIPT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
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


class TestHashDir(TestCase):
    """Tests for hash_dir function."""

    def test_empty_directory(self):
        """hash_dir returns a consistent hash for an empty directory."""
        with patch("os.listdir", return_value=[]):
            result = restart_on_ca_change.hash_dir("/tmp/secrets")
        self.assertIsInstance(result, str)
        self.assertEqual(len(result), 64)

    def test_skips_dotfiles(self):
        """hash_dir ignores files starting with a dot."""
        with patch("os.listdir", return_value=[".hidden", "ca.crt"]), patch(
            "os.path.isfile", return_value=True
        ), patch("builtins.open", mock_open(read_data=b"cert-data")):
            result_with_dot = restart_on_ca_change.hash_dir("/tmp/secrets")

        with patch("os.listdir", return_value=["ca.crt"]), patch(
            "os.path.isfile", return_value=True
        ), patch("builtins.open", mock_open(read_data=b"cert-data")):
            result_without_dot = restart_on_ca_change.hash_dir("/tmp/secrets")

        self.assertEqual(result_with_dot, result_without_dot)

    def test_different_content_different_hash(self):
        """hash_dir returns different hashes for different file contents."""
        with patch("os.listdir", return_value=["ca.crt"]), patch(
            "os.path.isfile", return_value=True
        ), patch("builtins.open", mock_open(read_data=b"cert-v1")):
            hash_v1 = restart_on_ca_change.hash_dir("/tmp/secrets")

        with patch("os.listdir", return_value=["ca.crt"]), patch(
            "os.path.isfile", return_value=True
        ), patch("builtins.open", mock_open(read_data=b"cert-v2")):
            hash_v2 = restart_on_ca_change.hash_dir("/tmp/secrets")

        self.assertNotEqual(hash_v1, hash_v2)

    def test_sorted_order_is_deterministic(self):
        """hash_dir processes files in sorted order."""
        with patch("os.listdir", return_value=["b.crt", "a.crt"]), patch(
            "os.path.isfile", return_value=True
        ), patch("builtins.open", mock_open(read_data=b"data")):
            hash_unsorted = restart_on_ca_change.hash_dir("/tmp/secrets")

        with patch("os.listdir", return_value=["a.crt", "b.crt"]), patch(
            "os.path.isfile", return_value=True
        ), patch("builtins.open", mock_open(read_data=b"data")):
            hash_sorted = restart_on_ca_change.hash_dir("/tmp/secrets")

        self.assertEqual(hash_unsorted, hash_sorted)


class TestMain(TestCase):
    """Tests for main function."""

    @patch("os.listdir", return_value=[])
    def test_empty_ca_directory_skips(self, _mock_listdir):
        """main skips when CA directory is empty."""
        with patch("builtins.print") as mock_print:
            restart_on_ca_change.main()
        mock_print.assert_called_once_with("CA directory empty, skipping")

    @patch("os.listdir", return_value=[".ca-hash-previous"])
    def test_only_dotfiles_skips(self, _mock_listdir):
        """main skips when directory only contains dotfiles."""
        with patch("builtins.print") as mock_print:
            restart_on_ca_change.main()
        mock_print.assert_called_once_with("CA directory empty, skipping")

    @patch("os.path.exists", return_value=False)
    @patch.object(restart_on_ca_change, "hash_dir", return_value="abc123")
    @patch("os.listdir", return_value=["ca.crt"])
    def test_initial_load_skips_restart(self, _mock_listdir, _mock_hash, _mock_exists):
        """main writes hash and skips restart on initial load."""
        with patch("builtins.open", mock_open()), patch("builtins.print") as mock_print:
            restart_on_ca_change.main()
        mock_print.assert_called_once_with("Initial CA load, skipping restart")

    @patch.object(restart_on_ca_change, "hash_dir", return_value="new-hash")
    @patch("os.path.exists", return_value=True)
    @patch("os.listdir", return_value=["ca.crt"])
    def test_unchanged_hash_no_restart(self, _mock_listdir, _mock_exists, _mock_hash):
        """main does nothing when hash has not changed."""
        with patch("builtins.open", mock_open(read_data="new-hash")), patch(
            "builtins.print"
        ) as mock_print:
            restart_on_ca_change.main()
        mock_print.assert_not_called()

    @patch.dict(
        os.environ,
        {
            "POD_NAMESPACE": "metalk8s-monitoring",
            "DEPLOYMENT_NAME": "oauth2-proxy-prometheus",
        },
    )
    @patch.object(restart_on_ca_change, "trigger_restart")
    @patch.object(restart_on_ca_change, "hash_dir", return_value="new-hash")
    @patch("os.path.exists", return_value=True)
    @patch("os.listdir", return_value=["ca.crt"])
    def test_changed_hash_triggers_restart(
        self,
        _mock_listdir,
        _mock_exists,
        _mock_hash,
        mock_restart,
    ):
        """main triggers restart when hash has changed."""
        with patch("builtins.open", mock_open(read_data="old-hash")), patch(
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

    @patch.dict(
        os.environ,
        {
            "POD_NAMESPACE": "metalk8s-monitoring",
            "DEPLOYMENT_NAME": "oauth2-proxy-prometheus",
        },
    )
    @patch.object(restart_on_ca_change, "hash_dir", return_value="new-hash")
    @patch("os.path.exists", return_value=True)
    @patch("os.listdir", return_value=["ca.crt"])
    def test_api_failure_exits_with_error(
        self, _mock_listdir, _mock_exists, _mock_hash
    ):
        """main exits with code 1 when the API call fails."""
        with patch("builtins.open", mock_open(read_data="old-hash")), patch.object(
            restart_on_ca_change,
            "trigger_restart",
            side_effect=urllib.error.URLError("refused"),
        ), patch("builtins.print"), self.assertRaises(SystemExit) as ctx:
            restart_on_ca_change.main()

        self.assertEqual(ctx.exception.code, 1)

    @patch.dict(
        os.environ,
        {
            "POD_NAMESPACE": "metalk8s-monitoring",
            "DEPLOYMENT_NAME": "oauth2-proxy-prometheus",
        },
    )
    @patch.object(restart_on_ca_change, "hash_dir", return_value="new-hash")
    @patch("os.path.exists", return_value=True)
    @patch("os.listdir", return_value=["ca.crt"])
    def test_hash_not_persisted_on_api_failure(
        self, _mock_listdir, _mock_exists, _mock_hash
    ):
        """Hash file is not updated when the API call fails."""
        mock_file = mock_open(read_data="old-hash")

        with patch("builtins.open", mock_file), patch.object(
            restart_on_ca_change,
            "trigger_restart",
            side_effect=urllib.error.URLError("refused"),
        ), patch("builtins.print"):
            try:
                restart_on_ca_change.main()
            except SystemExit:
                pass

        # Only the hash file read should have happened, no write
        write_calls = mock_file().write.call_args_list
        self.assertEqual(len(write_calls), 0)


class TestTriggerRestart(TestCase):
    """Tests for trigger_restart function."""

    @patch("urllib.request.urlopen")
    @patch("ssl.create_default_context")
    @patch(
        "builtins.open",
        mock_open(read_data="fake-token"),
    )
    def test_sends_patch_request(self, _mock_ssl, mock_urlopen):
        """trigger_restart sends a PATCH to the K8s API."""
        restart_on_ca_change.trigger_restart(
            "metalk8s-monitoring", "oauth2-proxy-prometheus"
        )

        mock_urlopen.assert_called_once()
        req = mock_urlopen.call_args[0][0]
        self.assertEqual(req.method, "PATCH")
        self.assertIn(
            "/namespaces/metalk8s-monitoring/deployments/oauth2-proxy-prometheus",
            req.full_url,
        )
        self.assertEqual(
            req.get_header("Content-type"),
            "application/strategic-merge-patch+json",
        )
        self.assertIn(
            "Bearer fake-token",
            req.get_header("Authorization"),
        )
