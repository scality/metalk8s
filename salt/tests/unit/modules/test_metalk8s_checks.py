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

    @utils.parameterized_from_cases(YAML_TESTS_CASES["node"])
    def test_node(self, packages_ret, services_ret, result,
                  expect_raise=False, **kwargs):
        """
        Tests the return of `node` function
        """
        packages_mock = MagicMock(return_value=packages_ret)
        services_mock = MagicMock(return_value=services_ret)

        salt_dict = {
            'metalk8s_checks.packages': packages_mock,
            'metalk8s_checks.services': services_mock
        }

        with patch.dict(metalk8s_checks.__grains__, {'id': 'my_node_1'}), \
                patch.dict(metalk8s_checks.__salt__, salt_dict):
            if expect_raise:
                self.assertRaisesRegex(
                    CheckError,
                    result,
                    metalk8s_checks.node,
                    **kwargs
                )
            else:
                self.assertEqual(
                    metalk8s_checks.node(**kwargs),
                    result
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["packages"])
    def test_packages(self, result, get_map_ret=None, list_pkgs_ret=None,
                      expect_raise=False, **kwargs):
        """
        Tests the return of `packages` function
        """
        get_map_mock = MagicMock(return_value=get_map_ret)
        list_pkgs_mock = MagicMock(return_value=list_pkgs_ret or {})

        salt_dict = {
            'metalk8s.get_from_map': get_map_mock,
            'pkg.list_pkgs': list_pkgs_mock
        }

        with patch.dict(metalk8s_checks.__salt__, salt_dict):
            if expect_raise:
                self.assertRaisesRegex(
                    CheckError,
                    result,
                    metalk8s_checks.packages,
                    **kwargs
                )
            else:
                self.assertEqual(
                    metalk8s_checks.packages(**kwargs),
                    result
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["services"])
    def test_services(self, result, get_map_ret=None, service_status_ret=None,
                      service_disabled_ret=None, expect_raise=False, **kwargs):
        """
        Tests the return of `services` function
        """
        get_map_mock = MagicMock(return_value=get_map_ret)
        service_status_mock = MagicMock(side_effect=(service_status_ret or {}).get)
        service_disabled_mock = MagicMock(side_effect=(service_disabled_ret or {}).get)

        salt_dict = {
            'metalk8s.get_from_map': get_map_mock,
            'service.status': service_status_mock,
            'service.disabled': service_disabled_mock
        }

        with patch.dict(metalk8s_checks.__salt__, salt_dict):
            if expect_raise:
                self.assertRaisesRegex(
                    CheckError,
                    result,
                    metalk8s_checks.services,
                    **kwargs
                )
            else:
                self.assertEqual(
                    metalk8s_checks.services(**kwargs),
                    result
                )

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
