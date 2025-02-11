import os.path
from unittest import TestCase
from unittest.mock import MagicMock, patch
import yaml

from _modules import metalk8s_olm

from tests.unit import mixins
from tests.unit import utils

YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_olm.yaml"
)

with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sOLMTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """Test case for the olm module"""

    loader_module = metalk8s_olm

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_olm.__virtual__(), "metalk8s_olm")

    @utils.parameterized_from_cases(YAML_TESTS_CASES["clustercatalog_serving"])
    def test_check_clustercatalog_serving(self, name, manifest, expected_result):
        """
        Tests the `check_clustercatalog_serving` function
        """
        get_object_mock = MagicMock(return_value=manifest)
        with patch.dict(
            metalk8s_olm.__salt__, {"metalk8s_kubernetes.get_object": get_object_mock}
        ):
            self.assertEqual(
                metalk8s_olm.check_clustercatalog_serving(name), expected_result
            )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["clusterextension_installed"])
    def test_check_clusterextension_installed(self, name, manifest, expected_result):
        """
        Tests the `check_clusterextension_installed` function
        """
        get_object_mock = MagicMock(return_value=manifest)
        with patch.dict(
            metalk8s_olm.__salt__, {"metalk8s_kubernetes.get_object": get_object_mock}
        ):
            self.assertEqual(
                metalk8s_olm.check_clusterextension_installed(name), expected_result
            )
