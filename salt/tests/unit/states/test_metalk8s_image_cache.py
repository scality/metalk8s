from unittest import TestCase
from unittest.mock import MagicMock, patch

from parameterized import parameterized
from salt.exceptions import CommandExecutionError

from _states import metalk8s_image_cache

from tests.unit import mixins

SOURCE = "/srv/scality/metalk8s/images/metalk8s-boot-cache-worker-1.0.0.tar"


class Metalk8sImageCacheTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """Tests for the `metalk8s_image_cache` state module."""

    loader_module = metalk8s_image_cache
    loader_module_globals = {"__opts__": {"test": False}}

    def _run(self, out=None, side_effect=None, source_override=None, **kwargs):
        run_all = MagicMock(return_value=out, side_effect=side_effect)
        source = SOURCE if source_override is None else source_override
        with patch.dict(metalk8s_image_cache.__salt__, {"cmd.run_all": run_all}):
            ret = metalk8s_image_cache.imported("worker-1-0-0", source, **kwargs)
        return ret, run_all

    def test_virtual(self):
        self.assertEqual(metalk8s_image_cache.__virtual__(), "metalk8s_image_cache")

    @parameterized.expand(
        [
            ("defaults", {}, []),
            ("cache path", {"cache_path": "/cache"}, ["--cache-path", "/cache"]),
            ("plain http", {"plain_http": True}, ["--plain-http"]),
        ]
    )
    def test_command(self, _, kwargs, flags):
        out = {"retcode": 0, "stdout": "extracted worker-1-0-0 into /x", "stderr": ""}
        _, run_all = self._run(out, **kwargs)
        run_all.assert_called_once_with(
            ["imagecachectl", "import", "--name", "worker-1-0-0", *flags, SOURCE],
            python_shell=False,
            timeout=None,
        )

    def test_extracted(self):
        out = {"retcode": 0, "stdout": "extracted worker-1-0-0 into /x\n", "stderr": ""}
        ret, _ = self._run(out)
        self.assertEqual(
            ret,
            {
                "name": "worker-1-0-0",
                "result": True,
                "changes": {"imported": SOURCE},
                "comment": "extracted worker-1-0-0 into /x",
            },
        )

    def test_already_held(self):
        out = {
            "retcode": 0,
            "stdout": "/cache already holds worker-1-0-0",
            "stderr": "",
        }
        ret, _ = self._run(out)
        self.assertTrue(ret["result"])
        self.assertEqual(ret["changes"], {})

    def test_failure(self):
        out = {"retcode": 1, "stdout": "", "stderr": "pull failed"}
        ret, _ = self._run(out)
        self.assertFalse(ret["result"])
        self.assertEqual(ret["changes"], {})
        self.assertIn("code 1", ret["comment"])
        self.assertIn("pull failed", ret["comment"])

    def test_next_source_after_a_failure(self):
        # The first endpoint is down, the second one answers.
        run_all = MagicMock(
            side_effect=[
                {"retcode": 1, "stdout": "", "stderr": "connection refused"},
                {
                    "retcode": 0,
                    "stdout": "extracted worker-1-0-0 into /x",
                    "stderr": "",
                },
            ]
        )
        with patch.dict(metalk8s_image_cache.__salt__, {"cmd.run_all": run_all}):
            ret = metalk8s_image_cache.imported("worker-1-0-0", ["reg-a/w", "reg-b/w"])
        self.assertEqual(run_all.call_count, 2)
        self.assertEqual(run_all.call_args.args[0][-1], "reg-b/w")
        self.assertTrue(ret["result"])
        self.assertEqual(ret["changes"], {"imported": "reg-b/w"})
        self.assertIn("reg-a/w", ret["comment"])

    def test_every_source_failed(self):
        out = {"retcode": 1, "stdout": "", "stderr": "connection refused"}
        run_all = MagicMock(return_value=out)
        with patch.dict(metalk8s_image_cache.__salt__, {"cmd.run_all": run_all}):
            ret = metalk8s_image_cache.imported("worker-1-0-0", ["reg-a/w", "reg-b/w"])
        self.assertFalse(ret["result"])
        # Each endpoint tried is named, for whoever reads the failed deployment.
        self.assertIn("reg-a/w", ret["comment"])
        self.assertIn("reg-b/w", ret["comment"])

    def test_no_source(self):
        ret, run_all = self._run(source_override=[])
        run_all.assert_not_called()
        self.assertFalse(ret["result"])

    def test_timeout(self):
        _, run_all = self._run({"retcode": 0, "stdout": "", "stderr": ""}, timeout=30)
        self.assertEqual(run_all.call_args.kwargs["timeout"], 30)

    def test_timeout_reason_kept(self):
        # Salt reports a timeout on stdout, with an empty stderr.
        out = {"retcode": 1, "stdout": "Timed out after 600 seconds", "stderr": ""}
        ret, _ = self._run(out, timeout=600)
        self.assertFalse(ret["result"])
        self.assertIn("Timed out", ret["comment"])

    def test_cannot_run(self):
        ret, _ = self._run(side_effect=CommandExecutionError("not found"))
        self.assertFalse(ret["result"])
        self.assertIn("not found", ret["comment"])

    def test_dry_run(self):
        with patch.dict(metalk8s_image_cache.__opts__, {"test": True}):
            ret, run_all = self._run(plain_http=True)
        run_all.assert_not_called()
        self.assertIsNone(ret["result"])
        self.assertIn("--plain-http", ret["comment"])
