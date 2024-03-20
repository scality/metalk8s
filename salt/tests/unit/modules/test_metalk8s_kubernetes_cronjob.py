import re
import time
from _modules import metalk8s_kubernetes_cronjob
from importlib import reload
import os.path
from unittest import TestCase
from unittest.mock import MagicMock, patch

from kubernetes.dynamic.exceptions import ResourceNotFoundError
from kubernetes.client.rest import ApiException
from parameterized import param, parameterized
from salt.exceptions import CommandExecutionError
import yaml

from tests.unit import mixins

from tests.unit import utils

from _modules import metalk8s_kubernetes_cronjob

YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "files",
    "test_metalk8s_kubernetes_cronjob.yaml",
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sKubernetesCronjobTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_kubernetes_cronjob` module
    """

    loader_module = metalk8s_kubernetes_cronjob

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(
            metalk8s_kubernetes_cronjob.__virtual__(), "metalk8s_kubernetes_cronjob"
        )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_cronjobs"])
    def test_get_cronjobs(
        self,
        result,
        list_objects=None,
        namespace="default",
        suspended=None,
        mark=None,
        all_namespaces=False,
        raises=False,
    ):
        mock_list_objects = MagicMock(return_value=list_objects)

        with patch.dict(
            metalk8s_kubernetes_cronjob.__salt__,
            {"metalk8s_kubernetes.list_objects": mock_list_objects},
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_kubernetes_cronjob.get_cronjobs,
                    suspended=suspended,
                    mark=mark,
                    all_namespaces=all_namespaces,
                    namespace=namespace,
                )

            else:
                self.assertEqual(
                    metalk8s_kubernetes_cronjob.get_cronjobs(
                        suspended=suspended,
                        mark=mark,
                        all_namespaces=all_namespaces,
                        namespace=namespace,
                    ),
                    result,
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_cronjob"])
    def test_get_cronjob(
        self,
        result,
        name,
        get_object=None,
        namespace="default",
        raises=False,
    ):
        mock_get_object = MagicMock(return_value=get_object)

        with patch.dict(
            metalk8s_kubernetes_cronjob.__salt__,
            {"metalk8s_kubernetes.get_object": mock_get_object},
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_kubernetes_cronjob.get_cronjob,
                    name,
                    namespace,
                )
            else:
                self.assertEqual(
                    metalk8s_kubernetes_cronjob.get_cronjob(name, namespace), result
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["_set_cronjob_suspend"])
    def test__set_cronjob_suspend(
        self,
        result,
        name,
        namespace,
        suspend,
        mark,
        spec_suspend,
        mark_suspend,
    ):
        mock_get_object = MagicMock(
            return_value={
                "name": name,
                "namespace": namespace,
                "spec": {"suspend": spec_suspend},
                "metadata": {
                    "uid": "1234",
                    "annotations": {"metalk8s.scality.com/suspend_mark": mark_suspend},
                },
            }
        )
        mock_update_object = MagicMock(return_value=None)

        with patch.dict(
            metalk8s_kubernetes_cronjob.__salt__,
            {
                "metalk8s_kubernetes.get_object": mock_get_object,
                "metalk8s_kubernetes.update_object": mock_update_object,
            },
        ):

            self.assertEqual(
                metalk8s_kubernetes_cronjob._set_cronjob_suspend(
                    name,
                    namespace,
                    suspend,
                    mark,
                ),
                result,
            )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["suspend_cronjob"])
    def test_suspend_cronjob(
        self, result, name="my_cronjob", namespace="default", mark=None
    ):
        mock__set_cronjob_suspend = MagicMock(return_value=True)

        with patch.object(
            metalk8s_kubernetes_cronjob,
            "_set_cronjob_suspend",
            mock__set_cronjob_suspend,
        ):

            self.assertEqual(
                metalk8s_kubernetes_cronjob.suspend_cronjob(name, namespace, mark),
                result,
            )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["activate_cronjob"])
    def test_activate_cronjob(
        self,
        result,
        name="my_cronjob",
        namespace="default",
    ):
        mock__set_cronjob_suspend = MagicMock(return_value=True)

        with patch.object(
            metalk8s_kubernetes_cronjob,
            "_set_cronjob_suspend",
            mock__set_cronjob_suspend,
        ):
            self.assertEqual(
                metalk8s_kubernetes_cronjob.activate_cronjob(name, namespace),
                result,
            )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_jobs"])
    def test_get_jobs(
        self,
        result,
        name,
        namespace,
        list_objects=None,
        get_cronjob=None,
    ):
        mock_list_objects = MagicMock(return_value=list_objects)
        mock_get_cronjob = MagicMock(return_value=get_cronjob)

        with patch.dict(
            metalk8s_kubernetes_cronjob.__salt__,
            {
                "metalk8s_kubernetes.list_objects": mock_list_objects,
            },
        ), patch.object(
            metalk8s_kubernetes_cronjob,
            "get_cronjob",
            mock_get_cronjob,
        ):
            self.assertEqual(
                metalk8s_kubernetes_cronjob.get_jobs(name, namespace),
                result,
            )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["suspend_cronjob_and_delete_jobs"])
    def test_suspend_cronjob_and_delete_jobs(
        self,
        result,
        name,
        namespace,
        mark=None,
        wait=False,
        timeout_seconds=60,
        get_jobs=None,
        delete_jobs_delay=0,
        raises=False,
    ):

        launch_ts = time.time()

        def get_jobs_call(name, namespace, **kwargs):
            if wait and time.time() - launch_ts >= delete_jobs_delay:
                return []
            return get_jobs

        mock_delete_object = MagicMock(return_value=None)
        mock_get_jobs = MagicMock(side_effect=get_jobs_call)

        with patch.dict(
            metalk8s_kubernetes_cronjob.__salt__,
            {"metalk8s_kubernetes.delete_object": mock_delete_object},
        ), patch.object(
            metalk8s_kubernetes_cronjob,
            "get_jobs",
            mock_get_jobs,
        ), patch.object(
            metalk8s_kubernetes_cronjob,
            "suspend_cronjob",
            MagicMock(return_value=True),
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    re.escape(result),
                    metalk8s_kubernetes_cronjob.suspend_cronjob_and_delete_jobs,
                    name,
                    namespace,
                    mark,
                    wait,
                    timeout_seconds,
                )
            else:
                self.assertEqual(
                    metalk8s_kubernetes_cronjob.suspend_cronjob_and_delete_jobs(
                        name,
                        namespace,
                        mark,
                        wait,
                        timeout_seconds,
                    ),
                    result,
                )
