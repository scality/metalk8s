import os.path
from unittest import TestCase
from unittest.mock import MagicMock, patch

from parameterized import param, parameterized
import yaml

from _modules import metalk8s_solutions_k8s

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "files",
    "test_metalk8s_solutions_k8s.yaml",
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sSolutionsK8sTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_solutions_k8s` module
    """

    loader_module = metalk8s_solutions_k8s

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_solutions_k8s.__virtual__(), "metalk8s_solutions")

    @utils.parameterized_from_cases(YAML_TESTS_CASES["list_active"])
    def test_list_active(self, configmap, result):
        """
        Tests the return of `list_active` function
        """
        patch_dict = {
            "metalk8s_kubernetes.get_object": MagicMock(return_value=configmap)
        }

        with patch.dict(metalk8s_solutions_k8s.__salt__, patch_dict):
            self.assertEqual(metalk8s_solutions_k8s.list_active(), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["list_environments"])
    def test_list_environments(self, namespaces, result, configmaps=None):
        """
        Tests the return of `list_environments` function
        """

        def _get_configmap_mock(namespace, **_):
            for configmap in configmaps or []:
                if configmap.get("namespace") == namespace:
                    return configmap
            return None

        patch_dict = {
            "metalk8s_kubernetes.list_objects": MagicMock(return_value=namespaces),
            "metalk8s_kubernetes.get_object": MagicMock(
                side_effect=_get_configmap_mock
            ),
        }

        with patch.dict(metalk8s_solutions_k8s.__salt__, patch_dict):
            self.assertEqual(metalk8s_solutions_k8s.list_environments(), result)
