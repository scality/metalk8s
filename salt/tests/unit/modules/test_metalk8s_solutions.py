import errno
import os.path
from unittest import TestCase
from unittest.mock import MagicMock, mock_open, patch

from parameterized import param, parameterized
from salt.exceptions import CommandExecutionError
import yaml

import metalk8s_solutions

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_solutions.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sSolutionsTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_solutions` module
    """

    loader_module = metalk8s_solutions

    def test_virtual_success(self):
        """
        Tests the return of `__virtual__` function, success
        """
        self.assertEqual(metalk8s_solutions.__virtual__(), "metalk8s_solutions")

    @utils.parameterized_from_cases(YAML_TESTS_CASES["read_config"])
    def test_read_config(self, create=False, config=None, result=None, raises=False):
        """
        Tests the return of `read_config` function
        """
        open_mock = mock_open(read_data=config)
        if not config:
            open_mock.side_effect = IOError(errno.ENOENT, "No such file or directory")

        with patch("salt.utils.files.fopen", open_mock), patch(
            "metalk8s_solutions._write_config_file", MagicMock()
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError, result, metalk8s_solutions.read_config
                )
            else:
                if create:
                    self.assertEqual(metalk8s_solutions.read_config(create), result)
                else:
                    self.assertEqual(metalk8s_solutions.read_config(), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["configure_archive"])
    def test_configure_archive(
        self, archive, removed=None, config=None, result=None, raises=False
    ):
        """
        Tests the return of `configure_archive` function
        """

        def _write_config_file_mock(new_config):
            if raises:
                raise CommandExecutionError("Failed to write Solutions config file")
            config = new_config

        read_config_mock = MagicMock(return_value=config)
        write_config_file_mock = MagicMock(side_effect=_write_config_file_mock)

        with patch("metalk8s_solutions.read_config", read_config_mock), patch(
            "metalk8s_solutions._write_config_file", write_config_file_mock
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    "Failed to write Solutions config file",
                    metalk8s_solutions.configure_archive,
                    archive,
                )
            else:
                self.assertEqual(
                    metalk8s_solutions.configure_archive(archive, removed=removed), True
                )
                self.assertEqual(config, result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["activate_solution"])
    def test_activate_solution(
        self,
        solution,
        version=None,
        config=None,
        result=None,
        available=None,
        raises=False,
    ):
        """
        Tests the return of `activate_solution` function
        """

        def _yaml_safe_dump_mock(data, _):
            if raises:
                raise Exception("Something bad happened! :/")
            config = data

        list_available_mock = MagicMock(return_value=available or {})
        read_config_mock = MagicMock(return_value=config)
        yaml_safe_dump_mock = MagicMock(side_effect=_yaml_safe_dump_mock)

        with patch("metalk8s_solutions.list_available", list_available_mock), patch(
            "metalk8s_solutions.read_config", read_config_mock
        ), patch("salt.utils.files.fopen", mock_open()), patch(
            "yaml.safe_dump", yaml_safe_dump_mock
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_solutions.activate_solution,
                    solution,
                    version,
                )
            else:
                if version:
                    self.assertEqual(
                        metalk8s_solutions.activate_solution(solution, version), True
                    )
                else:
                    self.assertEqual(
                        metalk8s_solutions.activate_solution(solution), True
                    )

                self.assertEqual(config, result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["deactivate_solution"])
    def test_deactivate_solution(
        self, solution, config=None, raises=False, result=None
    ):
        """
        Tests the return of `deactivate_solution` function
        """

        def _yaml_safe_dump_mock(data, _):
            if raises:
                raise Exception("Something bad happened! :/")
            config = data

        read_config_mock = MagicMock(return_value=config)
        yaml_safe_dump_mock = MagicMock(side_effect=_yaml_safe_dump_mock)

        with patch("metalk8s_solutions.read_config", read_config_mock), patch(
            "yaml.safe_dump", yaml_safe_dump_mock
        ), patch("salt.utils.files.fopen", mock_open()):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    "Failed to write Solutions config file",
                    metalk8s_solutions.deactivate_solution,
                    solution,
                )
            else:
                self.assertEqual(metalk8s_solutions.deactivate_solution(solution), True)
                self.assertEqual(config, result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["list_solution_images"])
    def test_list_solution_images(self, images=None, result=None, raises=False):
        """
        Tests the return of `list_solution_images` function
        """
        mountpoint = "/srv/scality/my-solution/"
        image_dir_prefix_len = len(os.path.join(mountpoint, "images"))

        if not images:
            images = {}

        def _get_image_name_and_version(path):
            version = None
            basename = path[image_dir_prefix_len:].lstrip("/")
            try:
                name, version = basename.split("/")
            except ValueError:
                name = basename
            return name, version

        def _path_isdir_mock(path):
            name, version = _get_image_name_and_version(path)
            return (
                images
                and (not name or images[name])
                and (not version or images[name][version])
            )

        def _listdir_mock(path):
            name, version = _get_image_name_and_version(path)
            if not name:
                return images.keys()
            return images[name].keys()

        path_isdir_mock = MagicMock(side_effect=_path_isdir_mock)
        listdir_mock = MagicMock(side_effect=_listdir_mock)

        with patch("os.path.isdir", path_isdir_mock), patch("os.listdir", listdir_mock):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_solutions.list_solution_images,
                    mountpoint,
                )
            else:
                self.assertEqual(
                    metalk8s_solutions.list_solution_images(mountpoint), result
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["read_solution_manifest"])
    def test_read_solution_manifest(self, manifest=None, result=None, raises=False):
        """
        Tests the return of `read_solution_manifest` function
        """
        path_isfile_mock = MagicMock(return_value=manifest is not None)
        list_solution_images_mock = MagicMock(return_value=[])
        fopen_mock = mock_open(read_data=manifest)

        mountpoint = "/srv/scality/my-solution"
        with patch("os.path.isfile", path_isfile_mock), patch(
            "salt.utils.files.fopen", fopen_mock
        ), patch("metalk8s_solutions.list_solution_images", list_solution_images_mock):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_solutions.read_solution_manifest,
                    mountpoint,
                )
            else:
                self.assertEqual(
                    metalk8s_solutions.read_solution_manifest(mountpoint), tuple(result)
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["manifest_from_iso"])
    def test_manifest_from_iso(self, manifest=None, result=None, raises=False):
        """
        Tests the return of `manifest_from_iso` function
        """

        def _cmd_run_all_mock(**_):
            if manifest is None:
                return {"retcode": 1, "stderr": "isoinfo error", "stdout": ""}
            return {"retcode": 0, "stdout": manifest}

        cmd_run_all_mock = MagicMock(side_effect=_cmd_run_all_mock)

        patch_dict = {"cmd.run_all": cmd_run_all_mock}
        path = "/tmp/my-solution.iso"
        with patch.dict(metalk8s_solutions.__salt__, patch_dict):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_solutions.manifest_from_iso,
                    path,
                )
            else:
                self.assertEqual(metalk8s_solutions.manifest_from_iso(path), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["list_available"])
    def test_list_available(self, mountpoints=None, archive_infos=None, result=None):
        """
        Tests the return of `list_available` function
        """
        mount_active_mock = MagicMock(return_value=mountpoints or {})
        read_solution_manifest_mock = MagicMock(return_value=(None, archive_infos))
        if archive_infos is None:
            read_solution_manifest_mock.side_effect = CommandExecutionError("Banana")

        salt_dict_patch = {
            "mount.active": mount_active_mock,
        }
        with patch.dict(metalk8s_solutions.__salt__, salt_dict_patch), patch(
            "metalk8s_solutions.read_solution_manifest", read_solution_manifest_mock
        ):
            self.assertEqual(metalk8s_solutions.list_available(), result or {})

    @utils.parameterized_from_cases(YAML_TESTS_CASES["operator_roles_from_manifest"])
    def test_operator_roles_from_manifest(
        self, manifest=None, result=None, raises=False
    ):
        """
        Tests the return of `operator_roles_from_manifest` function
        """
        path_isfile_mock = MagicMock(return_value=manifest is not None)
        fopen_mock = mock_open(read_data=manifest)

        mountpoint = "/srv/scality/my-solution"
        with patch("os.path.isfile", path_isfile_mock), patch(
            "salt.utils.files.fopen", fopen_mock
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_solutions.operator_roles_from_manifest,
                    mountpoint,
                )
            else:
                self.assertEqual(
                    metalk8s_solutions.operator_roles_from_manifest(mountpoint), result
                )
