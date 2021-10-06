import os.path
import tempfile
from unittest import TestCase
from unittest.mock import MagicMock, mock_open, patch

from parameterized import param, parameterized
from salt.exceptions import CommandExecutionError
import salt.renderers.jinja
import salt.renderers.yaml
import salt.utils.files
import yaml

import metalk8s

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


PRODUCT_TXT = """
NAME=MetalK8s
VERSION=2.5.0
SHORT_VERSION=2.5
GIT=2.5.0-0-g47705aa
DEVELOPMENT_RELEASE=0
BUILD_TIMESTAMP=2020-04-18T01:46:10Z
BUILD_HOST=kw029-prod-metalk8s-backend-0-22391-14681
"""


class Metalk8sTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s` module
    """

    loader_module = metalk8s
    loader_module_globals = {
        "__grains__": {"id": "my_node_1"},
        "__opts__": {
            "renderer": "jinja|yaml",
            "renderer_blacklist": [],
            "renderer_whitelist": [],
        },
        "__salt__": {},
    }

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s.__virtual__(), "metalk8s")

    @parameterized.expand(
        [
            (10, True, True),
            (10, False, False),
            (1, [True, False], True),
            (1, [False, True], False),
            (2, [False, True], True),
            (10, [False, False, False, False, True, False], True),
        ]
    )
    def test_wait_apiserver(self, retry, status, result):
        """
        Tests the return of `wait_apiserver` function
        """
        kubernetes_ping_mock = MagicMock()
        if isinstance(status, list):
            kubernetes_ping_mock.side_effect = status
        else:
            kubernetes_ping_mock.return_value = status

        patch_dict = {"metalk8s_kubernetes.ping": kubernetes_ping_mock}
        with patch.dict(metalk8s.__salt__, patch_dict):
            self.assertEqual(metalk8s.wait_apiserver(retry=retry, interval=0), result)

    @parameterized.expand(
        [
            (["192.168.1.10"], "IP:192.168.1.10"),
            (["fe80::1ff:fe23:4567:890a"], "IP:fe80::1ff:fe23:4567:890a"),
            (["192.168.1.10", "192.168.1.11"], "IP:192.168.1.10, IP:192.168.1.11"),
            (["my.dns.address"], "DNS:my.dns.address"),
            (["my.first.dns", "my.second.dns"], "DNS:my.first.dns, DNS:my.second.dns"),
            (["192.168.1.10", "my.dns.address"], "DNS:my.dns.address, IP:192.168.1.10"),
            (
                ["192.168.1.10", "my.second.dns", "192.168.1.11", "my.first.dns"],
                "DNS:my.first.dns, DNS:my.second.dns, IP:192.168.1.10, IP:192.168.1.11",
            ),
        ]
    )
    def test_format_san(self, names, result):
        """
        Tests the return of `format_san` function
        """
        self.assertEqual(metalk8s.format_san(names), result)

    @parameterized.expand(
        [
            (
                {"node1": {"roles": ["master"]}, "node2": {"roles": ["node"]}},
                "master",
                ["node1"],
            ),
            (
                {"node1": {"roles": ["master", "node"]}, "node2": {"roles": ["node"]}},
                "node",
                ["node1", "node2"],
            ),
            ({}, "master", []),
            ({"node1": {}, "node2": {}}, "master", []),
            (
                {"node1": {"roles": ["node"]}, "node2": {"roles": ["node"]}},
                "master",
                [],
            ),
            (None, "master", ["node1"], False, {"node1": {"roles": ["master"]}}),
            (None, "master", "Can't retrieve 'metalk8s:nodes' pillar", True),
            (
                None,
                "master",
                "Can't retrieve minions by role because of errors in pillar 'metalk8s:nodes': Error in pillar",
                True,
                {"_errors": ["Error in pillar"]},
            ),
        ]
    )
    def test_minions_by_role(
        self, nodes, role, result, raises=False, pillar_nodes=None
    ):
        """
        Tests the return of `minions_by_role` function
        """
        pillar_dict = {"metalk8s": {}}
        if pillar_nodes:
            pillar_dict["metalk8s"]["nodes"] = pillar_nodes

        with patch.dict(metalk8s.__pillar__, pillar_dict):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError, result, metalk8s.minions_by_role, role, nodes
                )
            else:
                self.assertEqual(
                    set(metalk8s.minions_by_role(role, nodes)), set(result)
                )

    @parameterized.expand(
        [
            (PRODUCT_TXT, {"version": "2.5.0", "name": "MetalK8s"}),
            (None, 'Path /my/path/ has no "product.txt"', True),
            ("Not a good product txt", {"version": None, "name": None}),
        ]
    )
    def test_archive_info_from_tree(self, product, result, raises=False):
        """
        Tests the return of `archive_info_from_tree` function
        """
        is_file_mock = MagicMock(return_value=product is not None)
        open_file_mock = mock_open(read_data=product)

        with patch("os.path.isfile", is_file_mock), patch(
            "salt.utils.files.fopen", open_file_mock
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s.archive_info_from_tree,
                    "/my/path/",
                )
            else:
                self.assertEqual(metalk8s.archive_info_from_tree("/my/path/"), result)
                open_file_mock.assert_called_once_with("/my/path/product.txt")

            is_file_mock.assert_called_once_with("/my/path/product.txt")

    @parameterized.expand(
        [
            (PRODUCT_TXT, {"version": "2.5.0", "name": "MetalK8s"}),
            (None, "Failed to run isoinfo: An error has occurred", True),
            ("Not a good product txt", {"version": None, "name": None}),
        ]
    )
    def test_archive_info_from_iso(self, product, result, raises=False):
        """
        Tests the return of `archive_info_from_iso` function
        """
        if product is None:
            iso_info_cmd_kwargs = {
                "retcode": 1,
                "stderr": "An error has occurred",
            }
        else:
            iso_info_cmd_kwargs = {"stdout": product}

        iso_info_cmd_mock = MagicMock(
            return_value=utils.cmd_output(**iso_info_cmd_kwargs)
        )

        with patch.dict(metalk8s.__salt__, {"cmd.run_all": iso_info_cmd_mock}):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s.archive_info_from_iso,
                    "/my/path/",
                )
            else:
                self.assertEqual(metalk8s.archive_info_from_iso("/my/path/iso"), result)

            iso_info_cmd_mock.assert_called_once()

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_archives"])
    def test_get_archives(
        self,
        archives,
        infos,
        result,
        invalid_path=False,
        raises=False,
        pillar_archives=None,
    ):
        """
        Tests the return of `get_archives` function
        """
        if invalid_path:
            infos_mock = MagicMock(
                side_effect=CommandExecutionError("Invalid archive path")
            )
        elif isinstance(infos, list):
            infos_mock = MagicMock(side_effect=infos)
        else:
            infos_mock = MagicMock(return_value=infos)

        pillar_dict = {"metalk8s": {}}
        if pillar_archives is not None:
            pillar_dict["metalk8s"]["archives"] = pillar_archives

        with patch("metalk8s.archive_info_from_product_txt", infos_mock), patch.dict(
            metalk8s.__pillar__, pillar_dict
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError, result, metalk8s.get_archives, archives
                )
            else:
                self.assertEqual(metalk8s.get_archives(archives), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["check_pillar_keys"])
    def test_check_pillar_keys(
        self,
        keys,
        result,
        raises=False,
        pillar_content=None,
        refresh_called=False,
        **kwargs,
    ):
        """
        Tests the return of `check_pillar_keys` function
        """
        pillar_get_mock = MagicMock()
        pillar_get_mock.return_value.compile_pillar.return_value = pillar_content

        with patch("metalk8s.get_pillar", pillar_get_mock), patch.dict(
            metalk8s.__pillar__, pillar_content or {}
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s.check_pillar_keys,
                    keys,
                    **kwargs,
                )
            else:
                self.assertEqual(metalk8s.check_pillar_keys(keys, **kwargs), result)

            if refresh_called:
                pillar_get_mock.assert_called_once()
            else:
                pillar_get_mock.assert_not_called()

    @utils.parameterized_from_cases(YAML_TESTS_CASES["format_slots"])
    def test_format_slots(self, data, result, slots_returns=None, raises=False):
        """
        Tests the return of `format_slots` function
        """
        salt_dict = {}

        if not slots_returns:
            slots_returns = {}

        for slot_name, slot_return in slots_returns.items():
            if slot_return is None:
                salt_dict[slot_name] = MagicMock(
                    side_effect=Exception("An error has occurred")
                )
            else:
                salt_dict[slot_name] = MagicMock(return_value=slot_return)

        with patch.dict(metalk8s.__salt__, salt_dict):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError, result, metalk8s.format_slots, data
                )
            else:
                self.assertEqual(metalk8s.format_slots(data), result)

    @parameterized.expand(
        [
            param([3, 5, 2, -4], [-4, 2, 3, 5]),
            param([3, 5, 2, -4], [5, 3, 2, -4], reverse=True),
            param([3, 5, 2, -4], [5, 3, 2, -4], cmp=lambda a, b: -1 if a > b else 1),
            param([3, 5, 2, -4], [2, 3, -4, 5], key=abs),
        ]
    )
    def test_cmp_sorted(self, obj, result, **kwargs):
        """
        Tests the return of `cmp_sorted` function
        """
        self.assertEqual(metalk8s.cmp_sorted(obj, **kwargs), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["manage_static_pod_manifest"])
    def test_manage_static_pod_manifest(
        self,
        name,
        result=None,
        error=None,
        pre_cached_source=False,
        cached_hash_mismatch=False,
        target_hash_mismatch=False,
        target_exists=True,
        target_dir_exists=True,
        target_links_to=None,
        target_stats=None,
        obfuscate_templates=False,
        get_diff_error=None,
        opts=None,
        cache_file_ret=None,
        atomic_copy_raises=None,
        **kwargs,
    ):
        """Test the behaviour of ``manage_static_pod_manifest` function."""

        isdir_mock = MagicMock(return_value=target_dir_exists)
        isfile_mock = MagicMock(return_value=target_exists)
        islink_mock = MagicMock(return_value=(target_links_to is not None))
        exists_mock = MagicMock(return_value=True)  # Only used for _clean_tmp
        remove_mock = MagicMock()  # Only used for _clean_tmp

        source_filename = ""
        if pre_cached_source:
            source_filename = os.path.join(
                tempfile.gettempdir(),
                "{}some-tmp-file".format(salt.utils.files.TEMPFILE_PREFIX),
            )

        real_name = name
        realpath_mock = MagicMock(side_effect=lambda x: x)
        if target_links_to is not None:
            real_name = target_links_to
            realpath_mock.return_value = target_links_to

        if cache_file_ret is None:
            cache_file_ret = os.path.join(
                tempfile.gettempdir(),
                "{}other-tmp-file".format(salt.utils.files.TEMPFILE_PREFIX),
            )
        cache_file_mock = MagicMock(return_value=cache_file_ret)

        def _atomic_copy(source, dest, user, group, mode, tmp_prefix):
            if atomic_copy_raises:
                raise OSError(atomic_copy_raises)

        atomic_copy_mock = MagicMock(side_effect=_atomic_copy)

        def _get_hash(filename, form="md5"):
            if cached_hash_mismatch and filename == source_filename:
                return "some-different-hash"

            if target_hash_mismatch and filename == real_name:
                return "some-outdated-hash"

            return "some-hash"

        get_hash_mock = MagicMock(side_effect=_get_hash)

        def _option(key):
            if key == "obfuscate_templates":
                return obfuscate_templates
            raise NotImplementedError(
                "This 'config.option' mock only handles the "
                "'obfuscate_templates' key"
            )

        option_mock = MagicMock(side_effect=_option)

        def _check_perms(name, ret, **kwargs):
            return ret, None

        check_perms_mock = MagicMock(side_effect=_check_perms)

        def _get_diff(*_a, **_k):
            if get_diff_error is not None:
                raise CommandExecutionError(get_diff_error)
            return "Some diff"

        get_diff_mock = MagicMock(side_effect=_get_diff)

        stats_mock = MagicMock(
            return_value=target_stats
            or {
                "user": "root",
                "group": "root",
                "mode": "0600",
            }
        )

        salt_dict = {
            "config.option": option_mock,
            "cp.cache_file": cache_file_mock,
            "file.check_perms": check_perms_mock,
            "file.get_diff": get_diff_mock,
            "file.stats": stats_mock,
        }
        opts_dict = dict(
            {
                "test": False,
                "hash_type": "md5",
                "file_roots": {"base": ["/srv/salt"]},
            },
            **(opts or {}),
        )
        call_kwargs = dict(
            {
                "source": "",
                "source_filename": source_filename,
                "source_sum": {"hsum": "some-hash"},
            },
            **kwargs,
        )

        with patch.dict(metalk8s.__opts__, opts_dict), patch.dict(
            metalk8s.__salt__, salt_dict
        ), patch("os.remove", remove_mock), patch("os.path.exists", exists_mock), patch(
            "os.path.isdir", isdir_mock
        ), patch(
            "os.path.isfile", isfile_mock
        ), patch(
            "os.path.islink", islink_mock
        ), patch(
            "os.path.realpath", realpath_mock
        ), patch(
            "metalk8s.get_hash", get_hash_mock
        ), patch(
            "metalk8s._atomic_copy", atomic_copy_mock
        ):
            actual_result = metalk8s.manage_static_pod_manifest(name, **call_kwargs)

        if error is not None:
            self.assertIsNone(
                result, "Cannot provide both `result` and `error` in a test case"
            )
            self.assertFalse(actual_result["result"])
            self.assertEqual(actual_result["comment"], error)
        else:
            self.assertEqual(actual_result, result)

        if cached_hash_mismatch:
            self.assertEqual(cache_file_mock.call_count, 1)

        if error is not None and atomic_copy_raises is None:
            # We should not have reached the tempfile cleanup
            self.assertEqual(remove_mock.call_count, 0)
        else:
            self.assertEqual(remove_mock.call_count, 1)

    @parameterized.expand(
        [
            param(),
            param(saltenv="my-salt-env", expected_saltenv="my-salt-env"),
            param(node_version="1.2.3", expected_saltenv="metalk8s-1.2.3"),
            param(node_version=None, expected_saltenv="base"),
        ]
    )
    def test_get_from_map(
        self, saltenv=None, expected_saltenv="base", node_version=None
    ):
        """
        Tests the return of `get_from_map` function
        """
        # NOTE: The goal is not to test the `compile_template` function from
        # salt so just ignore the return of the function but check that we
        # give the right arguments
        expected_args = {
            "input_data": '{% from "metalk8s/map.jinja" import my-key with context %}\n{{ my-key | tojson }}\n',
            "saltenv": expected_saltenv,
        }
        pillar_content = {}
        if node_version:
            pillar_content = {
                "metalk8s": {"nodes": {"my_node_1": {"version": node_version}}}
            }

        compile_template_mock = MagicMock()
        with patch.dict(metalk8s.__pillar__, pillar_content), patch(
            "salt.loader.render", MagicMock()
        ), patch("salt.template.compile_template", compile_template_mock):
            metalk8s.get_from_map("my-key", saltenv=saltenv)
            compile_template_mock.assert_called_once()
            self.assertEqual(
                dict(
                    compile_template_mock.call_args[1],
                    **expected_args,
                ),
                compile_template_mock.call_args[1],
            )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["archive_info_from_product_txt"])
    def test_archive_info_from_product_txt(
        self, archive, info, result, is_file=False, is_dir=False, raises=False
    ):
        info_mock = MagicMock(return_value=info)

        with patch("os.path.isdir", MagicMock(return_value=is_dir)), patch(
            "os.path.isfile", MagicMock(return_value=is_file)
        ), patch("metalk8s.archive_info_from_tree", info_mock), patch(
            "metalk8s.archive_info_from_iso", info_mock
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s.archive_info_from_product_txt,
                    archive,
                )
            else:
                self.assertEqual(
                    metalk8s.archive_info_from_product_txt(archive), result
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["configure_archive"])
    def test_configure_archive(
        self,
        archive,
        result,
        remove=None,
        config=None,
        invalid_path=False,
        raises=False,
    ):
        """
        Tests the return of `configure_archive` function
        """
        info_mock = MagicMock()
        if invalid_path:
            info_mock.side_effect = CommandExecutionError("Invalid archive path")

        with patch("metalk8s.archive_info_from_product_txt", info_mock), patch(
            "metalk8s._read_bootstrap_config", MagicMock(return_value=config)
        ), patch("metalk8s._write_bootstrap_config", MagicMock()):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s.configure_archive,
                    archive,
                    remove,
                )
            else:
                self.assertEqual(
                    metalk8s.configure_archive(archive, remove=remove), result
                )

    @parameterized.expand(
        [param(), param(True, "Failed to write bootstrap config file")]
    )
    def test__write_bootstrap_config(self, raises=False, result=None):
        open_mock = mock_open()
        if raises:
            open_mock.side_effect = Exception("A wild exception appears!")

        with patch("salt.utils.files.fopen", open_mock):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s._write_bootstrap_config,
                    None,
                )
            else:
                self.assertEqual(
                    metalk8s._write_bootstrap_config(None),
                    None,
                )

    @parameterized.expand(
        [param(), param(True, "Failed to load bootstrap config file")]
    )
    def test__read_bootstrap_config(self, raises=False, result=None):
        open_mock = mock_open(read_data="config")
        if raises:
            open_mock.side_effect = IOError("Weird I/O error!")

        with patch("salt.utils.files.fopen", open_mock):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s._read_bootstrap_config,
                )
            else:
                self.assertEqual(
                    metalk8s._read_bootstrap_config(),
                    "config",
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["backup_node"])
    def test_backup_node(self, result, version="2.10.0", archives=None, raises=False):
        def _cmd_run_all(cmd):
            ret = {"retcode": 0, "stdout": "OK", "stderr": "Boom!"}
            if raises:
                ret["retcode"] = 1
            return ret

        salt_dict = {"cmd.run_all": MagicMock(side_effect=_cmd_run_all)}
        pillar_dict = {"metalk8s": {"cluster_version": version}}

        with patch.dict(metalk8s.__salt__, salt_dict), patch.dict(
            metalk8s.__pillar__, pillar_dict
        ), patch("metalk8s.get_archives", MagicMock(return_value=archives or {})):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s.backup_node,
                )
            else:
                self.assertEqual(metalk8s.backup_node(), result)
