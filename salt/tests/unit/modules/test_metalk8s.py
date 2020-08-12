import os.path
import yaml

from parameterized import param, parameterized

from salt.exceptions import CommandExecutionError

from salttesting.mixins import LoaderModuleMockMixin
from salttesting.unit import TestCase
from salttesting.mock import MagicMock, mock_open, patch

from tests.unit import utils

import metalk8s


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "files", "test_metalk8s.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


PRODUCT_TXT = '''
NAME=MetalK8s
VERSION=2.5.0
SHORT_VERSION=2.5
GIT=2.5.0-0-g47705aa
DEVELOPMENT_RELEASE=0
BUILD_TIMESTAMP=2020-04-18T01:46:10Z
BUILD_HOST=kw029-prod-metalk8s-backend-0-22391-14681
'''


class Metalk8sTestCase(TestCase, LoaderModuleMockMixin):
    """
    TestCase for `metalk8s` module
    """
    loader_module = metalk8s
    loader_module_globals = {
        "__grains__": {
            "id": "my_node_1"
        }
    }

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s.__virtual__(), 'metalk8s')

    @parameterized.expand([
        (10, True, True),
        (10, False, False),
        (1, [True, False], True),
        (1, [False, True], False),
        (2, [False, True], True),
        (10, [False, False, False, False, True, False], True)
    ])
    def test_wait_apiserver(self, retry, status, result):
        """
        Tests the return of `wait_apiserver` function
        """
        kubernetes_ping_mock = MagicMock()
        if isinstance(status, list):
            kubernetes_ping_mock.side_effect = status
        else:
            kubernetes_ping_mock.return_value = status

        patch_dict = {
            'metalk8s_kubernetes.ping': kubernetes_ping_mock
        }
        with patch.dict(metalk8s.__salt__, patch_dict):
            self.assertEqual(
                metalk8s.wait_apiserver(retry=retry, interval=0),
                result
            )

    @parameterized.expand([
        (['192.168.1.10'], 'IP:192.168.1.10'),
        (['fe80::1ff:fe23:4567:890a'], 'IP:fe80::1ff:fe23:4567:890a'),
        (['192.168.1.10', '192.168.1.11'], 'IP:192.168.1.10, IP:192.168.1.11'),
        (['my.dns.address'], 'DNS:my.dns.address'),
        (['my.first.dns', 'my.second.dns'], 'DNS:my.first.dns, DNS:my.second.dns'),
        (['192.168.1.10', 'my.dns.address'], 'DNS:my.dns.address, IP:192.168.1.10'),
        (['192.168.1.10', 'my.second.dns', '192.168.1.11', 'my.first.dns'], 'DNS:my.first.dns, DNS:my.second.dns, IP:192.168.1.10, IP:192.168.1.11')
    ])
    def test_format_san(self, names, result):
        """
        Tests the return of `format_san` function
        """
        self.assertEqual(metalk8s.format_san(names), result)

    @parameterized.expand([
        ({'node1': {'roles': ['master']}, 'node2': {'roles': ['node']}}, 'master', ['node1']),
        ({'node1': {'roles': ['master', 'node']}, 'node2': {'roles': ['node']}}, 'node', ['node1', 'node2']),
        ({}, 'master', []),
        ({'node1': {}, 'node2': {}}, 'master', []),
        ({'node1': {'roles': ['node']}, 'node2': {'roles': ['node']}}, 'master', []),
        (None, 'master', ['node1'], False, {'node1': {'roles': ['master']}}),
        (None, 'master', "Can't retrieve 'metalk8s:nodes' pillar: 'nodes'", True),
        (None, 'master', "Can't retrieve minions by role because of errors in pillar 'metalk8s:nodes': Error in pillar", True, {'_errors': ['Error in pillar']})
    ])
    def test_minions_by_role(self, nodes, role, result,
                             raises=False, pillar_nodes=None):
        """
        Tests the return of `minions_by_role` function
        """
        pillar_dict = {
            'metalk8s': {}
        }
        if pillar_nodes:
            pillar_dict['metalk8s']['nodes'] = pillar_nodes

        with patch.dict(metalk8s.__pillar__, pillar_dict):
            if raises:
                self.assertRaisesRegexp(
                    CommandExecutionError,
                    result,
                    metalk8s.minions_by_role,
                    role,
                    nodes
                )
            else:
                self.assertEqual(
                    set(metalk8s.minions_by_role(role, nodes)),
                    set(result)
                )

    @parameterized.expand([
        (PRODUCT_TXT, {'version': '2.5.0', 'name': 'MetalK8s'}),
        (None, 'Path /my/path/ has no "product.txt"', True),
        ("Not a good product txt", {'version': None, 'name': None})
    ])
    def test_archive_info_from_tree(self, product, result, raises=False):
        """
        Tests the return of `archive_info_from_tree` function
        """
        is_file_mock = MagicMock(return_value=product is not None)
        open_file_mock = mock_open(read_data=product)

        with patch("os.path.isfile", is_file_mock), \
                patch("salt.utils.files.fopen", open_file_mock):
            if raises:
                self.assertRaisesRegexp(
                    CommandExecutionError,
                    result,
                    metalk8s.archive_info_from_tree,
                    "/my/path/"
                )
            else:
                self.assertEqual(
                    metalk8s.archive_info_from_tree("/my/path/"),
                    result
                )
                open_file_mock.assert_called_once_with("/my/path/product.txt")

            is_file_mock.assert_called_once_with("/my/path/product.txt")

    @parameterized.expand([
        (PRODUCT_TXT, {'version': '2.5.0', 'name': 'MetalK8s'}),
        (None, 'Failed to run isoinfo: An error has occurred', True),
        ("Not a good product txt", {'version': None, 'name': None})
    ])
    def test_archive_info_from_iso(self, product, result, raises=False):
        """
        Tests the return of `archive_info_from_iso` function
        """
        if product is None:
            iso_info_cmd_kwargs = {
                'retcode': 1,
                'stderr': 'An error has occurred',
            }
        else:
            iso_info_cmd_kwargs = {
                'stdout': product
            }

        iso_info_cmd_mock = MagicMock(
            return_value=utils.cmd_output(**iso_info_cmd_kwargs)
        )

        with patch.dict(metalk8s.__salt__, {'cmd.run_all': iso_info_cmd_mock}):
            if raises:
                self.assertRaisesRegexp(
                    CommandExecutionError,
                    result,
                    metalk8s.archive_info_from_iso,
                    "/my/path/"
                )
            else:
                self.assertEqual(
                    metalk8s.archive_info_from_iso("/my/path/iso"),
                    result
                )

            iso_info_cmd_mock.assert_called_once()

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_archives"])
    def test_get_archives(self, archives, infos, result,
                          is_dirs=False, is_files=False,
                          raises=False, pillar_archives=None):
        """
        Tests the return of `get_archives` function
        """
        infos_mock = MagicMock()
        is_dirs_mock = MagicMock()
        is_files_mock = MagicMock()

        for mock, var in [
                (infos_mock, infos), (is_dirs_mock, is_dirs),
                (is_files_mock, is_files)]:
            if isinstance(var, list):
                mock.side_effect = var
            else:
                mock.return_value = var

        pillar_dict = {
            'metalk8s': {}
        }
        if pillar_archives is not None:
            pillar_dict['metalk8s']['archives'] = pillar_archives

        with patch("os.path.isdir", is_dirs_mock), \
                patch("os.path.isfile", is_files_mock), \
                patch("metalk8s.archive_info_from_tree", infos_mock), \
                patch("metalk8s.archive_info_from_iso", infos_mock), \
                patch.dict(metalk8s.__pillar__, pillar_dict):
            if raises:
                self.assertRaisesRegexp(
                    CommandExecutionError,
                    result,
                    metalk8s.get_archives,
                    archives
                )
            else:
                self.assertEqual(
                    metalk8s.get_archives(archives),
                    result
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["check_pillar_keys"])
    def test_check_pillar_keys(self, keys, result, raises=False,
                               pillar_content=None, refresh_called=False,
                               **kwargs):
        """
        Tests the return of `check_pillar_keys` function
        """
        pillar_get_mock = MagicMock()
        pillar_get_mock.return_value.compile_pillar.return_value = \
            pillar_content

        with patch("metalk8s.get_pillar", pillar_get_mock), \
                patch.dict(metalk8s.__pillar__, pillar_content or {}):
            if raises:
                self.assertRaisesRegexp(
                    CommandExecutionError,
                    result,
                    metalk8s.check_pillar_keys,
                    keys,
                    **kwargs
                )
            else:
                self.assertEqual(
                    metalk8s.check_pillar_keys(keys, **kwargs),
                    result
                )

            if refresh_called:
                pillar_get_mock.assert_called_once()
            else:
                pillar_get_mock.assert_not_called()

    @parameterized.expand(
        param.explicit(kwargs=test_case)
        for test_case in yaml.safe_load(open(YAML_TESTS_FILE))["format_slots"]
    )
    def test_format_slots(self, data, result, slots_returns=None,
                          raises=False):
        """
        Tests the return of `format_slots` function
        """
        salt_dict = {}

        if not slots_returns:
            slots_returns = {}

        for slot_name, slot_return in slots_returns.items():
            if slot_return is None:
                salt_dict[slot_name] = MagicMock(
                    side_effect=Exception('An error has occurred')
                )
            else:
                salt_dict[slot_name] = MagicMock(return_value=slot_return)

        with patch.dict(metalk8s.__salt__, salt_dict):
            if raises:
                self.assertRaisesRegexp(
                    CommandExecutionError,
                    result,
                    metalk8s.format_slots,
                    data
                )
            else:
                self.assertEqual(
                    metalk8s.format_slots(data),
                    result
                )
