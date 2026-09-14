from importlib import reload
import json
import os.path
from unittest import TestCase
from unittest.mock import MagicMock, mock_open, patch

import kubernetes.dynamic
from parameterized import param, parameterized
from salt.exceptions import CommandExecutionError
from urllib3.exceptions import HTTPError
import yaml

from _modules import metalk8s_kubernetes_utils

from tests.unit import mixins
from tests.unit import utils

YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "files",
    "test_metalk8s_kubernetes_utils.yaml",
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sKubernetesUtilsTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_kubernetes_utils` module
    """

    loader_module = metalk8s_kubernetes_utils

    def test_virtual_success(self):
        """
        Tests the return of `__virtual__` function, success
        """
        reload(metalk8s_kubernetes_utils)
        self.assertEqual(metalk8s_kubernetes_utils.__virtual__(), "metalk8s_kubernetes")

    @parameterized.expand(
        [
            (("kubernetes.client.rest", "kubernetes")),
            (("urllib3.exceptions", "urllib3")),
        ]
    )
    def test_virtual_fail_import(self, import_error_on, dep_error=None):
        """
        Tests the return of `__virtual__` function, fail import
        """
        with utils.ForceImportErrorOn(import_error_on):
            reload(metalk8s_kubernetes_utils)
            self.assertTupleEqual(
                metalk8s_kubernetes_utils.__virtual__(),
                (
                    False,
                    "Missing dependencies: {}".format(dep_error or import_error_on),
                ),
            )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_kubeconfig"])
    def test_get_kubeconfig(
        self,
        result,
        api_server_pillar=None,
        config_options=None,
        kwargs={},
    ):
        """
        Tests the return of `get_kubeconfig` function
        """
        pillar_dict = {}
        if api_server_pillar:
            pillar_dict = {"metalk8s": {"api_server": api_server_pillar}}

        config_options_dict = {}
        if config_options:
            config_options_dict = config_options

        config_options_mock = MagicMock(side_effect=config_options_dict.get)

        salt_dict = {
            "config.option": config_options_mock,
        }

        with patch.dict(metalk8s_kubernetes_utils.__pillar__, pillar_dict), patch.dict(
            metalk8s_kubernetes_utils.__salt__, salt_dict
        ):
            self.assertEqual(
                tuple(result), metalk8s_kubernetes_utils.get_kubeconfig(**kwargs)
            )

    @parameterized.expand(
        [
            ({"major": "1", "go_version": "go1.13.8"},),
            ("Failed to get version info", True, True),
        ]
    )
    def test_get_version_info(
        self,
        result,
        k8s_connection_raise=False,
        raises=False,
    ):
        """
        Tests the return of `get_version_info` function
        """
        kubeconfig_mock = MagicMock(return_value=("my_kubeconfig.conf", "my_context"))

        dynamic_client_mock = MagicMock()
        dynamic_client_mock.version = {"kubernetes": result}

        get_client_mock = MagicMock(return_value=dynamic_client_mock)

        utils_dict = {"metalk8s_kubernetes.get_client": get_client_mock}

        if k8s_connection_raise:
            get_client_mock.side_effect = HTTPError("Failed to connect")

        with patch.object(
            metalk8s_kubernetes_utils, "get_kubeconfig", kubeconfig_mock
        ), patch.dict(metalk8s_kubernetes_utils.__utils__, utils_dict):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_kubernetes_utils.get_version_info,
                )
            else:
                self.assertEqual(metalk8s_kubernetes_utils.get_version_info(), result)

    @parameterized.expand(
        [
            (True,),
            (False, True),
            (False, False, True),
        ]
    )
    def test_ping(
        self,
        result,
        k8s_connection_raise=False,
        get_client_raise=False,
    ):
        """
        Tests the return of `ping` function
        """
        kubeconfig_mock = MagicMock(return_value=("my_kubeconfig.conf", "my_context"))

        dynamic_client_mock = MagicMock()
        if k8s_connection_raise:
            dynamic_client_mock.request.side_effect = HTTPError("Failed to connect")

        get_client_mock = MagicMock(return_value=dynamic_client_mock)
        if get_client_raise:
            get_client_mock.side_effect = HTTPError("Failed to connect")

        with patch.object(
            metalk8s_kubernetes_utils, "get_kubeconfig", kubeconfig_mock
        ), patch.dict(
            metalk8s_kubernetes_utils.__utils__,
            {"metalk8s_kubernetes.get_client": get_client_mock},
        ):
            self.assertEqual(
                result,
                metalk8s_kubernetes_utils.ping(),
            )

        if get_client_raise:
            dynamic_client_mock.request.assert_not_called()
        else:
            dynamic_client_mock.request.assert_called_once_with(
                "get",
                "/version",
                serialize=False,
                _request_timeout=metalk8s_kubernetes_utils.PING_REQUEST_TIMEOUT,
            )

        self.assertEqual(dynamic_client_mock.version.mock_calls, [])

    def test_ping_does_not_deserialize_the_response(self):
        """
        Tests that `ping` does not deserialize the `/version` response

        Driven against a real `DynamicClient` rather than a mock: `/version`
        carries no `kind`, which the default `ResourceInstance` serializer
        requires, so deserializing a successful response raises `KeyError`.
        """
        version_body = json.dumps(
            {"major": "1", "minor": "33", "gitVersion": "v1.33.7"}
        ).encode("utf8")

        api_client_mock = MagicMock()
        api_client_mock.call_api.return_value = MagicMock(data=version_body)

        # Bypass discovery.
        client = kubernetes.dynamic.DynamicClient(
            api_client_mock, discoverer=lambda _client, _cache_file: MagicMock()
        )

        kubeconfig_mock = MagicMock(return_value=("my_kubeconfig.conf", "my_context"))
        get_client_mock = MagicMock(return_value=client)

        with patch.object(
            metalk8s_kubernetes_utils, "get_kubeconfig", kubeconfig_mock
        ), patch.dict(
            metalk8s_kubernetes_utils.__utils__,
            {"metalk8s_kubernetes.get_client": get_client_mock},
        ):
            self.assertTrue(metalk8s_kubernetes_utils.ping())

        api_client_mock.call_api.assert_called_once()
        self.assertEqual(
            api_client_mock.call_api.call_args[1]["_request_timeout"],
            metalk8s_kubernetes_utils.PING_REQUEST_TIMEOUT,
        )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["read_and_render_yaml_file"])
    def test_read_and_render_yaml_file(
        self, source, result, template=None, opts=True, raises=False, **kwargs
    ):
        """
        Tests the return of `read_and_render_yaml_file` function
        """
        cache_file_mock = MagicMock()
        open_file_mock = mock_open(read_data=source)
        cache_file_mock.return_value = source

        opts_dict = {}
        if opts:
            opts_dict = {
                "cachedir": "/path/to/cache/dir",
                "extension_modules": "/path/to/dummy/extension/module",
                "file_client": "local",
                "file_ignore_glob": None,
                "fileserver_backend": None,
            }
        patch_dict = {"cp.cache_file": cache_file_mock}
        with patch.dict(metalk8s_kubernetes_utils.__opts__, opts_dict), patch.dict(
            metalk8s_kubernetes_utils.__salt__, patch_dict
        ), patch("salt.utils.files.fopen", open_file_mock):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_kubernetes_utils.read_and_render_yaml_file,
                    source="my-source-file",
                    template=template,
                    **kwargs
                )
            else:
                self.assertEqual(
                    result,
                    metalk8s_kubernetes_utils.read_and_render_yaml_file(
                        source="my-source-file", template=template, **kwargs
                    ),
                )

    @parameterized.expand(
        param.explicit(kwargs=test_case)
        for test_case in YAML_TESTS_CASES["get_service_endpoints"]
    )
    def test_get_service_endpoints(self, obj, result, raises=False):
        """
        Tests the return of `get_service_endpoints` function
        """
        get_object_mock = MagicMock()

        if obj is False:
            get_object_mock.side_effect = CommandExecutionError("An error has occurred")
        else:
            get_object_mock.return_value = obj

        salt_dict = {"metalk8s_kubernetes.get_object": get_object_mock}

        with patch.dict(metalk8s_kubernetes_utils.__salt__, salt_dict):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_kubernetes_utils.get_service_endpoints,
                    "my_service",
                    namespace="my_namespace",
                    kubeconfig="my-kubeconf",
                )
            else:
                self.assertEqual(
                    result,
                    metalk8s_kubernetes_utils.get_service_endpoints(
                        "my_service", namespace="my_namespace", kubeconfig="my-kubeconf"
                    ),
                )

    @parameterized.expand(
        param.explicit(kwargs=test_case)
        for test_case in YAML_TESTS_CASES["get_service_ips_and_ports"]
    )
    def test_get_service_ips_and_ports(self, obj, result, raises=False):
        """
        Tests the return of `get_service_ips_and_ports` function
        """
        get_object_mock = MagicMock()

        if obj is False:
            get_object_mock.side_effect = CommandExecutionError("An error has occurred")
        else:
            get_object_mock.return_value = obj

        salt_dict = {"metalk8s_kubernetes.get_object": get_object_mock}

        with patch.dict(metalk8s_kubernetes_utils.__salt__, salt_dict):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_kubernetes_utils.get_service_ips_and_ports,
                    "my_service",
                    namespace="my_namespace",
                    kubeconfig="my-kubeconf",
                )
            else:
                self.assertEqual(
                    result,
                    metalk8s_kubernetes_utils.get_service_ips_and_ports(
                        "my_service", namespace="my_namespace", kubeconfig="my-kubeconf"
                    ),
                )
