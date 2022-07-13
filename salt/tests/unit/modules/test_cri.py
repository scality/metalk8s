import os.path
import json
from unittest import TestCase
from unittest.mock import MagicMock, patch
import yaml

from parameterized import parameterized
from salt.exceptions import CommandExecutionError

from _modules import cri

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_cri.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


IMAGES_LIST = [
    {
        "id": "sha256:da86e6ba6ca197bf6bc5e9d900febd906b133eaa4750e6bed647b0fbe50ed43e",
        "repoTags": ["k8s.gcr.io/pause:3.1"],
        "repoDigests": [],
        "size": "746400",
        "uid": None,
        "username": "",
    },
    {
        "id": "sha256:2c4adeb21b4ff8ed3309d0e42b6b4ae39872399f7b37e0856e673b13c4aba13d",
        "repoTags": [
            "metalk8s-registry-from-config.invalid/metalk8s-2.4.2/etcd:3.3.10",
            "myEtcdTag",
        ],
        "repoDigests": [
            "metalk8s-registry-from-config.invalid/metalk8s-2.4.2/etcd@sha256:240bd81c2f54873804363665c5d1a9b8e06ec5c63cfc181e026ddec1d81585bb"
        ],
        "size": "76160693",
        "uid": None,
        "username": "",
    },
]

COMPONENT_LIST = [
    {
        "id": "225a77f7ef0df4347ac7ac81a351f3b122b592cbbee62e157061cf28a811ac45",
        "metadata": {
            "name": "etcd-bootstrap",
            "uid": "f556b9016283651c92291c6d844ea468",
            "namespace": "kube-system",
            "attempt": 2,
        },
        "state": "SANDBOX_READY",
        "createdAt": "1593676785281403260",
        "labels": {
            "component": "etcd",
            "io.kubernetes.pod.name": "etcd-bootstrap",
            "io.kubernetes.pod.namespace": "kube-system",
            "io.kubernetes.pod.uid": "f556b9016283651c92291c6d844ea468",
            "metalk8s.scality.com/version": "2.5.1-dev",
            "tier": "control-plane",
        },
        "annotations": {
            "kubernetes.io/config.hash": "f556b9016283651c92291c6d844ea468",
            "kubernetes.io/config.seen": "2020-07-02T07:59:42.325844296Z",
            "kubernetes.io/config.source": "file",
            "scheduler.alpha.kubernetes.io/critical-pod": "",
        },
    }
]


class CriTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `cri` module
    """

    loader_module = cri

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(cri.__virtual__(), "cri")

    @parameterized.expand(
        [
            (0, json.dumps({"images": IMAGES_LIST}, indent=4), IMAGES_LIST),
            (1, "this command failed", None),
            (0, json.dumps({"images": []}, indent=4), []),
        ]
    )
    def test_list_image(self, retcode, stdout, result):
        """
        Tests the return of `list_images` function
        """
        cmd = utils.cmd_output(retcode=retcode, stdout=stdout)
        mock_cmd = MagicMock(return_value=cmd)
        with patch.dict(cri.__salt__, {"cmd.run_all": mock_cmd}):
            self.assertEqual(cri.list_images(), result)
            mock_cmd.assert_called_once_with("crictl images -o json")

    @parameterized.expand(
        [
            (IMAGES_LIST, "k8s.gcr.io/pause:3.1", True),
            (
                IMAGES_LIST,
                "metalk8s-registry-from-config.invalid/metalk8s-2.4.2/etcd:3.3.10",
                True,
            ),
            (IMAGES_LIST, "myEtcdTag", True),
            (
                IMAGES_LIST,
                "metalk8s-registry-from-config.invalid/metalk8s-2.4.2/etcd@sha256:240bd81c2f54873804363665c5d1a9b8e06ec5c63cfc181e026ddec1d81585bb",
                True,
            ),
            (IMAGES_LIST, "Abc", False),
            (None, "k8s.gcr.io/pause:3.1", False),
            ([], "k8s.gcr.io/pause:3.1", False),
        ]
    )
    def test_available(self, images_list, name, result):
        """
        Tests the return of `available` function
        """
        with patch.object(cri, "list_images", MagicMock(return_value=images_list)):
            self.assertEqual(cri.available(name), result)

    @parameterized.expand(
        [
            (
                0,
                "Image is up to date for sha256:2bd222736f60f13a760bcfcc0728e4bd0812169d9d3068c01319c72102c9972a",
                {
                    "digests": {
                        "sha256": "2bd222736f60f13a760bcfcc0728e4bd0812169d9d3068c01319c72102c9972a"
                    }
                },
            ),
            (1, "", None),
            (0, "Not expected result", {"digests": {}}),
        ]
    )
    def test_pull_image(self, retcode, stdout, result):
        """
        Tests the return of `pull_image` function
        """
        cmd = utils.cmd_output(retcode=retcode, stdout=stdout)
        mock_cmd = MagicMock(return_value=cmd)
        with patch.dict(cri.__salt__, {"cmd.run_all": mock_cmd}):
            self.assertEqual(cri.pull_image("my-images"), result)
            mock_cmd.assert_called_once_with('crictl pull "my-images"')

    @parameterized.expand(
        [
            (0, "292c3b07b", 0, "All ok", "All ok"),
            (1, "292c3b07b", 0, "All ok", None),
            (0, "", 0, "All ok", None),
            (0, "292c3b07b", 1, "All not ok", None),
            (0, "292c3b07b", 0, "", ""),
        ]
    )
    def test_execute(self, ret_ps, stdout_ps, ret_exec, stdout_exec, result):
        """
        Tests the return of `execute` function
        """
        cmd_ps = utils.cmd_output(retcode=ret_ps, stdout=stdout_ps)
        cmd_exec = utils.cmd_output(retcode=ret_exec, stdout=stdout_exec)

        def _cmd_run_all_mock(cmd):
            if "crictl ps" in cmd:
                return cmd_ps
            elif "crictl exec" in cmd:
                return cmd_exec
            return None

        mock_cmd = MagicMock(side_effect=_cmd_run_all_mock)
        with patch.dict(cri.__salt__, {"cmd.run_all": mock_cmd}):
            self.assertEqual(cri.execute("my_cont", "my command"), result)
            mock_cmd.assert_any_call(
                'crictl ps -q --label io.kubernetes.container.name="my_cont"'
            )
            if ret_ps == 0 and stdout_ps:
                mock_cmd.assert_called_with(
                    "crictl exec {} my command ".format(stdout_ps)
                )

    @parameterized.expand(
        [
            # Success: Found one container
            (None, 6, 0, "292c3b07b", True),
            # Failure: Container does not exist
            (
                None,
                6,
                0,
                "",
                'Failed to find container "my_cont": No container found',
                True,
            ),
            # Failure: Error occurred when executing crictl command
            (
                None,
                6,
                1,
                "Error occurred",
                'Failed to find container "my_cont": Error occurred',
                True,
            ),
            # Success: Found one running container
            ("running", 6, 0, "292c3b07b", True),
            # Failure: Container does not exist or is not running
            (
                "running",
                6,
                0,
                "",
                'Failed to find container "my_cont" in state "running": No container found',
                True,
            ),
            # Failure: Error occurred when executing crictl command
            (
                "running",
                6,
                1,
                "Error occurred",
                'Failed to find container "my_cont" in state "running": Error occurred',
                True,
            ),
        ]
    )
    def test_wait_container(
        self, state, timeout, retcode, stdout, result, raises=False
    ):
        """
        Tests the return of `wait_container` function
        """
        cmd = utils.cmd_output(retcode=retcode, stdout=stdout)
        mock_cmd = MagicMock(return_value=cmd)

        with patch.dict(cri.__salt__, {"cmd.run_all": mock_cmd}), patch(
            "time.sleep", MagicMock()
        ):
            if raises:
                self.assertRaisesRegex(
                    Exception,
                    result,
                    cri.wait_container,
                    "my_cont",
                    state=state,
                    timeout=timeout,
                )
            else:
                self.assertEqual(
                    cri.wait_container("my_cont", state=state, timeout=timeout), result
                )
            cmd_call = 'crictl ps -q --label io.kubernetes.container.name="my_cont"'
            if state:
                cmd_call += " --state {}".format(state)
            mock_cmd.assert_called_with(cmd_call)

    @parameterized.expand(
        [
            (0, json.dumps({"items": COMPONENT_LIST}, indent=4), True),
            (1, "this command failed", False),
            (0, json.dumps({"items": []}, indent=4), False),
        ]
    )
    def test_component_is_running(self, retcode, stdout, result):
        """
        Tests the return of `component_is_running` function
        """
        cmd = utils.cmd_output(retcode=retcode, stdout=stdout)
        mock_cmd = MagicMock(return_value=cmd)
        with patch.dict(cri.__salt__, {"cmd.run_all": mock_cmd}):
            self.assertEqual(cri.component_is_running("my_comp"), result)

    @parameterized.expand([(0, True), (1, False)])
    def test_ready(self, retcode, result):
        """
        Tests the return of `ready` function
        """
        mock_cmd = MagicMock(return_value=retcode)
        with patch.dict(cri.__salt__, {"cmd.retcode": mock_cmd}):
            self.assertEqual(cri.ready(), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["stop_pod"])
    def test_stop_pod(
        self, result, pod_ids=None, pod_ids_raise=None, pod_stop_out=None, raises=False
    ):
        """Test the return value of `stop_pod`."""
        pod_labels = {"my.label": "ABCD"}

        def pod_id_mock(*args, **kwargs):
            self.assertEqual(args, ())
            self.assertEqual(
                kwargs, dict(labels=pod_labels, multiple=True, ignore_not_found=True)
            )
            if pod_ids_raise:
                raise CommandExecutionError(pod_ids_raise)
            return pod_ids

        def cmd_run_mock(cmd):
            self.assertEqual(cmd, f"crictl stopp {' '.join(pod_ids)}")
            return utils.cmd_output(**(pod_stop_out or {}))

        salt_dict = {"cmd.run_all": MagicMock(side_effect=cmd_run_mock)}

        with patch.dict(cri.__salt__, salt_dict), patch.object(
            cri, "get_pod_id", pod_id_mock
        ):
            if raises:
                with self.assertRaises(CommandExecutionError, msg=result):
                    cri.stop_pod(pod_labels)
            else:
                self.assertEqual(cri.stop_pod(pod_labels), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_pod_id"])
    def test_get_pod_id(
        self,
        result,
        pod_ids_out=None,
        pod_stop_out=None,
        raises=False,
        expected_cmd_args=None,
        **kwargs,
    ):
        """Test the return value of `get_pod_id`."""
        expect_cmd = f"crictl pods --quiet"
        if expected_cmd_args:
            expect_cmd += f" {expected_cmd_args}"

        def cmd_run_mock(cmd):
            self.assertEqual(cmd, expect_cmd)
            return utils.cmd_output(**(pod_ids_out or {}))

        salt_dict = {"cmd.run_all": MagicMock(side_effect=cmd_run_mock)}

        with patch.dict(cri.__salt__, salt_dict):
            if raises:
                with self.assertRaises(CommandExecutionError, msg=result):
                    cri.get_pod_id(**kwargs)
            else:
                self.assertEqual(cri.get_pod_id(**kwargs), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["wait_pod"])
    def test_wait_pod(
        self,
        result,
        pod_ids=None,
        pod_ids_raise=None,
        raises=False,
        **kwargs,
    ):
        """Test the return value of `wait_pod`."""
        timer = [0]

        def sleep_mock(duration):
            timer.append(timer[-1] + duration)

        def time_mock():
            return timer[-1]

        result_iterator = iter(pod_ids or [])

        def pod_ids_mock(*a, **k):
            self.assertEqual(a, ())
            self.assertEqual(
                k,
                dict(
                    name=kwargs.get("name"),
                    state=kwargs.get("state", "ready"),
                    ignore_not_found=True,
                ),
            )
            if pod_ids_raise:
                raise CommandExecutionError(pod_ids_raise)
            return next(result_iterator)

        with patch("time.sleep", sleep_mock), patch(
            "time.time", time_mock
        ), patch.object(cri, "get_pod_id", MagicMock(side_effect=pod_ids_mock)):
            if raises:
                with self.assertRaises(CommandExecutionError, msg=result):
                    cri.wait_pod(**kwargs)
            else:
                self.assertEqual(cri.wait_pod(**kwargs), result)
