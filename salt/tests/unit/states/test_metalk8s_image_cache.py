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

    def _run(self, out=None, side_effect=None, **kwargs):
        run_all = MagicMock(return_value=out, side_effect=side_effect)
        with patch.dict(metalk8s_image_cache.__salt__, {"cmd.run_all": run_all}):
            ret = metalk8s_image_cache.imported("worker-1-0-0", SOURCE, **kwargs)
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
