import os.path
import yaml

from unittest import TestCase
from unittest.mock import MagicMock, patch

from _modules import metalk8s_os

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_os.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sOsTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_os` module
    """

    loader_module = metalk8s_os

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_os.__virtual__(), "metalk8s_os")

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_kubereserved"])
    def test_get_kubereserved(self, num_cpus, mem_total, result):
        """
        Tests the return of `get_kubereserved` function
        """

        grains_dict = {"num_cpus": num_cpus, "mem_total": mem_total}

        with patch.dict(metalk8s_os.__grains__, grains_dict):
            self.assertEqual(
                metalk8s_os.get_kubereserved(),
                result,
            )
