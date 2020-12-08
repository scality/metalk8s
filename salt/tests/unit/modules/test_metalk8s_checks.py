import os.path
from unittest import TestCase
from unittest.mock import MagicMock, patch

from parameterized import parameterized
from salt.exceptions import CheckError
import yaml

import metalk8s_checks

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "files", "test_metalk8s_checks.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sChecksTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_checks` module
    """
    loader_module = metalk8s_checks

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_checks.__virtual__(), 'metalk8s_checks')

    @utils.parameterized_from_cases(YAML_TESTS_CASES["sysctl"])
    def test_sysctl(self, params, data, result, raises=False):
        """
        Tests the return of `sysctl` function
        """
        sysctl_get_mock = MagicMock(side_effect=data.get)

        patch_dict = {
            'sysctl.get': sysctl_get_mock
        }

        with patch.dict(metalk8s_checks.__salt__, patch_dict):
            if raises:
                self.assertRaisesRegex(
                    CheckError,
                    result,
                    metalk8s_checks.sysctl,
                    params
                )
            else:
                self.assertEqual(
                    metalk8s_checks.sysctl(params, raises=False),
                    result
                )
