import os.path
from unittest import TestCase
from unittest.mock import MagicMock, patch

from parameterized import param, parameterized
from salt.exceptions import CommandExecutionError
import yaml

from _modules import metalk8s_volumes

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_volumes.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


def device_name_mock(path):
    if path.startswith("/dev/my_vg/"):
        path = "dm-2"
    return {"success": True, "result": os.path.basename(path)}


class Metalk8sVolumesTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_volumes` module
    """

    loader_module = metalk8s_volumes

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_volumes.__virtual__(), "metalk8s_volumes")

    @utils.parameterized_from_cases(YAML_TESTS_CASES["exists"])
    def test_exists(
        self,
        name,
        result,
        raises=False,
        pillar_volumes=None,
        is_file=True,
        get_size=1073741824,
        is_blkdev=True,
        lvdisplay=None,
    ):
        """
        Tests the return of `exists` function
        """
        pillar_dict = {"metalk8s": {"volumes": pillar_volumes or {}}}

        salt_dict = {
            "file.is_blkdev": MagicMock(return_value=is_blkdev),
            "lvm.lvdisplay": MagicMock(return_value=lvdisplay or {}),
        }

        is_file_mock = MagicMock(return_value=is_file)
        get_size_mock = MagicMock(return_value=get_size)

        # Glob is used only for lvm, let simulate that we have 2 lvm volume
        glob_mock = MagicMock(return_value=["/dev/dm-1", "/dev/dm-2"])

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), patch.dict(
            metalk8s_volumes.__salt__, salt_dict
        ), patch.object(metalk8s_volumes, "device_name", device_name_mock), patch(
            "glob.glob", glob_mock
        ), patch(
            "os.path.isfile", is_file_mock
        ), patch(
            "os.path.getsize", get_size_mock
        ):
            if raises:
                self.assertRaisesRegex(
                    ValueError, result, metalk8s_volumes.exists, name
                )
            else:
                self.assertEqual(metalk8s_volumes.exists(name), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["create"])
    def test_create(
        self,
        name,
        raise_msg=None,
        pillar_volumes=None,
        ftruncate=True,
        lvcreate=None,
        lvcreate_forced=None,
    ):
        """
        Tests the return of `create` function
        """
        pillar_dict = {"metalk8s": {"volumes": pillar_volumes or {}}}

        ftruncate_mock = MagicMock(return_value=ftruncate)
        if not ftruncate:
            ftruncate_mock.side_effect = OSError("An error has occurred")

        # Glob is used only for lvm, let simulate that we have 2 lvm volume
        glob_mock = MagicMock(return_value=["/dev/dm-1", "/dev/dm-2"])

        lvcreate_mock = MagicMock(return_value=lvcreate)
        if not lvcreate:
            lvcreate_mock.side_effect = Exception("Banana")
        if isinstance(lvcreate, str):
            lvcreate_mock.return_value = {"Output from lvcreate": lvcreate}

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), patch.dict(
            metalk8s_volumes.__salt__, {"lvm.lvcreate": lvcreate_mock}
        ), patch.object(metalk8s_volumes, "device_name", device_name_mock), patch(
            "glob.glob", glob_mock
        ), patch(
            "os.open", MagicMock()
        ), patch(
            "os.unlink", MagicMock()
        ), patch(
            "os.ftruncate", ftruncate_mock
        ):
            if raise_msg:
                self.assertRaisesRegex(
                    Exception, raise_msg, metalk8s_volumes.create, name
                )
            else:
                # This function does not return anything
                metalk8s_volumes.create(name)

        if lvcreate_forced is not None:
            lvcreate_mock.assert_called_once()
            call_kwargs = lvcreate_mock.call_args[1]
            self.assertIn("force", call_kwargs)
            self.assertEqual(call_kwargs["force"], lvcreate_forced)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["is_prepared"])
    def test_is_prepared(
        self,
        name,
        result,
        raises=False,
        uuid_return=None,
        device_name_return=True,
        pillar_volumes=None,
    ):
        """
        Tests the return of `is_prepared` function
        """
        pillar_dict = {"metalk8s": {"volumes": pillar_volumes or {}}}

        get_blkid_mock = MagicMock()
        probe_mock = get_blkid_mock.return_value.__enter__.return_value.probe
        probe_mock.return_value.uuid = uuid_return

        utils_dict = {
            "metalk8s_volumes.get_superblock_flags": MagicMock(),
            "metalk8s_volumes.get_blkid_probe": get_blkid_mock,
        }

        def _device_name(path):
            if path.startswith("/dev/disk/by-partuuid/"):
                if device_name_return is True:
                    return {"success": True, "result": os.path.basename(path)}
                elif device_name_return is False or device_name_return is None:
                    return {"success": False, "result": "An error has occurred"}
                else:
                    return {"success": True, "result": device_name_return}
            return {"success": True, "result": os.path.basename(path)}

        # Glob is used only for lvm, let simulate that we have 2 lvm volume
        glob_mock = MagicMock(return_value=["/dev/dm-1", "/dev/dm-2"])

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), patch.dict(
            metalk8s_volumes.__utils__, utils_dict
        ), patch.object(metalk8s_volumes, "device_name", _device_name), patch(
            "glob.glob", glob_mock
        ):
            if raises:
                self.assertRaisesRegex(
                    Exception, result, metalk8s_volumes.is_prepared, name
                )
            else:
                self.assertEqual(metalk8s_volumes.is_prepared(name), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["prepare"])
    def test_prepare(
        self,
        name,
        raise_msg=False,
        current_fstype=None,
        has_partition=False,
        pillar_volumes=None,
        cmd_output=None,
    ):
        """
        Tests the return of `prepare` function
        """
        pillar_dict = {"metalk8s": {"volumes": pillar_volumes or {}}}

        get_blkid_mock = MagicMock()
        probe_mock = get_blkid_mock.return_value.__enter__.return_value.probe
        probe_mock.return_value.fstype = current_fstype
        probe_mock.return_value.has_partition = has_partition

        utils_dict = {
            "metalk8s_volumes.get_superblock_flags": MagicMock(),
            "metalk8s_volumes.get_blkid_probe": get_blkid_mock,
        }

        if cmd_output is None:
            cmd_kwargs = {"retcode": 1, "stderr": "An error has occurred"}
        else:
            cmd_kwargs = {"stdout": cmd_output}

        salt_dict = {
            "cmd.run_all": MagicMock(return_value=utils.cmd_output(**cmd_kwargs))
        }

        # Glob is used only for lvm, let simulate that we have 2 lvm volume
        glob_mock = MagicMock(return_value=["/dev/dm-1", "/dev/dm-2"])

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), patch.dict(
            metalk8s_volumes.__salt__, salt_dict
        ), patch.dict(metalk8s_volumes.__utils__, utils_dict), patch.object(
            metalk8s_volumes, "device_name", device_name_mock
        ), patch(
            "glob.glob", glob_mock
        ):
            if raise_msg:
                self.assertRaisesRegex(
                    Exception, raise_msg, metalk8s_volumes.prepare, name
                )
            else:
                # This function does not return anything
                metalk8s_volumes.prepare(name)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["is_cleaned_up"])
    def test_is_cleaned_up(
        self, name, result, raises=False, exists=False, pillar_volumes=None
    ):
        """
        Tests the return of `is_cleaned_up` function
        """
        pillar_dict = {"metalk8s": {"volumes": pillar_volumes or {}}}

        # Glob is used only for lvm, let simulate that we have 2 lvm volume
        glob_mock = MagicMock(return_value=["/dev/dm-1", "/dev/dm-2"])

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), patch.object(
            metalk8s_volumes.SparseLoopDevice, "exists", exists
        ), patch.object(metalk8s_volumes, "device_name", device_name_mock), patch(
            "glob.glob", glob_mock
        ):
            if raises:
                self.assertRaisesRegex(
                    Exception, result, metalk8s_volumes.is_cleaned_up, name
                )
            else:
                self.assertEqual(metalk8s_volumes.is_cleaned_up(name), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["clean_up"])
    def test_clean_up(
        self, name, raise_msg=False, pillar_volumes=None, remove_error=None
    ):
        """
        Tests the return of `clean_up` function
        """
        pillar_dict = {"metalk8s": {"volumes": pillar_volumes or {}}}

        remove_mock = MagicMock()
        if remove_error:
            if not isinstance(remove_error, list):
                remove_error = [remove_error]
            remove_mock.side_effect = OSError(*remove_error)

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), patch.object(
            metalk8s_volumes, "device_name", device_name_mock
        ), patch("os.remove", remove_mock):
            if raise_msg:
                self.assertRaisesRegex(
                    Exception, raise_msg, metalk8s_volumes.clean_up, name
                )
            else:
                # This function does not return anything
                metalk8s_volumes.clean_up(name)

    @parameterized.expand(
        [
            # Nominal case: device exists.
            ("exists", [True], "my-device"),
            # Error case: device doesn't exists.
            ("missing", [False] * 10, "device `/dev/my-device` not found"),
            # Device is temporarily missing.
            ("transient-missing", [False, False, False, True], "my-device"),
        ]
    )
    def test_device_name(self, _, exist_values, result):
        expected = {"success": any(exist_values), "result": result}
        exists_mock = MagicMock(side_effect=exist_values)
        realpath_mock = MagicMock(side_effect=lambda path: path)
        with patch("os.path.exists", exists_mock), patch(
            "os.path.realpath", realpath_mock
        ), patch("time.sleep", MagicMock()):
            result = metalk8s_volumes.device_name("/dev/my-device")
            self.assertEqual(result, expected)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["device_info"])
    def test_device_info(
        self,
        name,
        result,
        raises=False,
        is_blkdev=True,
        exists_values=True,
        check_udevadm=False,
        pillar_volumes=None,
    ):
        """
        Tests the return of `device_info` function
        """
        pillar_dict = {"metalk8s": {}}

        if pillar_volumes:
            pillar_dict["metalk8s"]["volumes"] = pillar_volumes

        cmd_mock = MagicMock(return_value=utils.cmd_output(stdout="OK"))

        salt_dict = {
            "saltutil.refresh_pillar": MagicMock(),
            "disk.dump": MagicMock(return_value={"getsize64": 4242}),
            "file.is_blkdev": MagicMock(return_value=is_blkdev),
            "cmd.run_all": cmd_mock,
        }

        # Glob is used only for lvm, let simulate that we have 2 lvm volume
        glob_mock = MagicMock(return_value=["/dev/dm-1", "/dev/dm-2"])
        exists_mock = MagicMock()
        if isinstance(exists_values, list):
            exists_mock.side_effect = exists_values
        else:
            exists_mock.return_value = exists_values

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), patch.dict(
            metalk8s_volumes.__salt__, salt_dict
        ), patch.object(metalk8s_volumes, "device_name", device_name_mock), patch(
            "glob.glob", glob_mock
        ), patch(
            "os.path.exists", exists_mock
        ), patch.object(
            metalk8s_volumes.Volume, "is_prepared", True
        ), patch.object(
            metalk8s_volumes.SparseLoopDeviceBlock, "is_prepared", True
        ), patch.object(
            metalk8s_volumes.RawBlockDeviceBlock, "is_prepared", True
        ):
            if raises:
                self.assertRaisesRegex(
                    Exception, result, metalk8s_volumes.device_info, name
                )
            else:
                self.assertEqual(result, metalk8s_volumes.device_info(name))
            if check_udevadm:
                self.assertEqual(cmd_mock.call_count, 2)
                self.assertRegex(cmd_mock.call_args_list[0][0][0], "udevadm trigger.*")
                self.assertRegex(cmd_mock.call_args_list[1][0][0], "udevadm settle.*")
            else:
                cmd_mock.assert_not_called()


class RawBlockDeviceBlockTestCase(TestCase):
    @parameterized.expand(
        [
            ("disk", "/dev/sda", None),
            ("partition", "/dev/sda1", "1"),
            ("virtual-disk", "/dev/vdc", None),
            ("virtual-disk-part", "/dev/vdc2", "2"),
            ("nvme", "/dev/nvme0n1", None),
            ("nvme-part", "/dev/nvme0n1p3", "3"),
            ("lvm", "/dev/dm-0", None),
        ]
    )
    def test_get_partition(self, _, name, expected):
        partition = metalk8s_volumes.RawBlockDeviceBlock._get_partition(name)
        self.assertEqual(partition, expected)
