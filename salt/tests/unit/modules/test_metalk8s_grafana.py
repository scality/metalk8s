import json
import os.path
import yaml

from parameterized import param, parameterized

from salttesting.mixins import LoaderModuleMockMixin
from salttesting.unit import TestCase
from salttesting.mock import MagicMock, patch

import metalk8s_grafana

from tests.unit import utils

YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "files", "test_metalk8s_grafana.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sGrafanaTestCase(TestCase, LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_grafana` module
    """
    loader_module = metalk8s_grafana

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_grafana.__virtual__(), 'metalk8s_grafana')

    @utils.parameterized_from_cases(YAML_TESTS_CASES)
    def test_load_dashboard(self, dashboard, result, raises=False, **kwargs):
        """
        Tests the return of `load_dashboard` function
        """
        get_file_str_mock = MagicMock(
            return_value=json.dumps(dashboard, indent=4) if dashboard else ""
        )
        patch_dict = {
            'cp.get_file_str': get_file_str_mock
        }
        with patch.dict(metalk8s_grafana.__salt__, patch_dict):
            if raises:
                self.assertRaisesRegexp(
                    AssertionError,
                    result,
                    metalk8s_grafana.load_dashboard,
                    path="my_dashboard.json",
                    **kwargs
                )
            else:
                self.assertDictContainsSubset(
                    result,
                    metalk8s_grafana.load_dashboard(
                        path="my_dashboard.json",
                        **kwargs
                    )
                )

