import os.path
import yaml

from parameterized import param, parameterized

from salt.exceptions import CommandExecutionError

from salttesting.mixins import LoaderModuleMockMixin
from salttesting.unit import TestCase
from salttesting.mock import MagicMock, patch

import metalk8s_service_configuration

YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "files", "test_metalk8s_service_configuration.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sServiceConfigurationTestCase(TestCase, LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_service_configuration` module
    """
    loader_module = metalk8s_service_configuration

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(
            metalk8s_service_configuration.__virtual__(),
            'metalk8s_service_configuration'
        )

    @parameterized.expand([
        param.explicit(kwargs=test_case)
        for test_case in YAML_TESTS_CASES["get_service_config"]
    ])
    def test_get_service_conf(
        self,
        configmap_name,
        result,
        configmap_obj=None,
        default_csc=None,
        object_get=True,
        raises=False,
        **kwargs
    ):
        """
        Tests the return of `get_service_conf` function
        """
        get_configmap_mock = MagicMock()

        if default_csc is None:
            default_csc = {}

        if object_get:
            get_configmap_mock.return_value = configmap_obj
        else:
            get_configmap_mock.side_effect = ValueError(
                'Failed to read ConfigMap object my_configmap'
            )

        salt_dict = {
            'metalk8s_kubernetes.get_object': get_configmap_mock
        }

        with patch.dict(metalk8s_service_configuration.__salt__, salt_dict):
            if raises:
                self.assertRaisesRegexp(
                    CommandExecutionError,
                    result,
                    metalk8s_service_configuration.get_service_conf,
                    namespace="my_namespace",
                    configmap_name=configmap_name,
                    default_csc=default_csc,
                    **kwargs
                )
            else:
                self.assertEqual(
                    metalk8s_service_configuration.get_service_conf(
                        namespace="my_namespace",
                        configmap_name=configmap_name,
                        default_csc=default_csc,
                    ), result
                )
                get_configmap_mock.assert_called_once()
