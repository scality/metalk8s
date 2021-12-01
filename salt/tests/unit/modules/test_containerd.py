from unittest import TestCase
from unittest.mock import MagicMock, patch

from parameterized import parameterized

from _modules import containerd

from tests.unit import mixins
from tests.unit import utils


class ContainerdTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `containerd` module
    """

    loader_module = containerd

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(containerd.__virtual__(), "containerd")

    @parameterized.expand(["/tmp/pause-3.1.tar", "/root/toto.tar"])
    def test_load_cri_image(self, path):
        """
        Tests the return of `load_cri_image` function
        """
        cmd = utils.cmd_output(
            stderr='time="2020-07-02T08:02:46Z" '
            'level=debug msg="unpacking 1 images"',
            stdout="unpacking k8s.gcr.io/my-image:3.1 (sha256:3efe4ff64c93123e"
            "1217b0ad6d23b4c87a1fc2109afeff55d2f27d70c55d8f73)...done",
        )
        mock_cmd = MagicMock(return_value=cmd)
        with patch.dict(containerd.__salt__, {"cmd.run_all": mock_cmd}):
            self.assertEqual(containerd.load_cri_image(path), cmd)
            mock_cmd.assert_called_once_with(
                'ctr --debug -n k8s.io image import "{}"'.format(path)
            )

    def test_load_cri_image_with_fullname(self):
        """
        Tests the return of `load_cri_image` function
        """
        cmd = utils.cmd_output(
            stderr='time="2020-07-02T08:02:46Z" '
            'level=debug msg="unpacking 1 images"',
            stdout="unpacking abc.def/my-image:3.5 (sha256:3efe4ff64c93123e"
            "1217b0ad6d23b4c87a1fc2109afeff55d2f27d70c55d8f73)...done\n"
            "unpacking k8s.gcr.io/my-image:3.5 (sha256:3efe4ff64c93123e"
            "1217b0ad6d23b4c87a1fc2109afeff55d2f27d70c55d8f73)...done",
        )
        mock_cmd = MagicMock(return_value=cmd)
        with patch.dict(containerd.__salt__, {"cmd.run_all": mock_cmd}):
            self.assertEqual(
                containerd.load_cri_image(
                    "/tmp/toto.tar", fullname="abc.def/my-image:3.5"
                ),
                cmd,
            )
            mock_cmd.assert_called_once_with(
                'ctr --debug -n k8s.io image import "/tmp/toto.tar" --index-name "abc.def/my-image:3.5"'
            )
