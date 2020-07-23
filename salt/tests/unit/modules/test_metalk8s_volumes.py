import os.path
import yaml

from parameterized import param, parameterized

from salt.exceptions import CommandExecutionError

from salttesting.mixins import LoaderModuleMockMixin
from salttesting.unit import TestCase
from salttesting.mock import MagicMock, patch

from tests.unit import utils

import metalk8s_volumes


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "files", "test_metalk8s_volumes.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sVolumesTestCase(TestCase, LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_volumes` module
    """
    loader_module = metalk8s_volumes

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_volumes.__virtual__(), 'metalk8s_volumes')

    @parameterized.expand(
        param.explicit(kwargs=test_case)
        for test_case in YAML_TESTS_CASES["exists"]
    )
    def test_exists(self, name, result, raises=False, pillar_volumes=None,
                    is_file=True, get_size=1073741824, is_blkdev=True):
        """
        Tests the return of `exists` function
        """
        pillar_dict = {
            'metalk8s': {
                'volumes': pillar_volumes or {}
            }
        }

        salt_dict = {
            'file.is_blkdev': MagicMock(return_value=is_blkdev)
        }

        is_file_mock = MagicMock(return_value=is_file)
        get_size_mock = MagicMock(return_value=get_size)

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), \
                patch.dict(metalk8s_volumes.__salt__, salt_dict), \
                patch("os.path.isfile", is_file_mock), \
                patch("os.path.getsize", get_size_mock):
            if raises:
                self.assertRaisesRegexp(
                    ValueError,
                    result,
                    metalk8s_volumes.exists,
                    name
                )
            else:
                self.assertEqual(
                    metalk8s_volumes.exists(name),
                    result
                )

    @parameterized.expand(
        param.explicit(kwargs=test_case)
        for test_case in YAML_TESTS_CASES["create"]
    )
    def test_create(self, name, raise_msg=None, pillar_volumes=None,
                    ftruncate=True):
        """
        Tests the return of `create` function
        """
        pillar_dict = {
            'metalk8s': {
                'volumes': pillar_volumes or {}
            }
        }

        ftruncate_mock = MagicMock(return_value=ftruncate)
        if not ftruncate:
            ftruncate_mock.side_effect = OSError("An error has occurred")

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), \
                patch("os.open", MagicMock()), \
                patch("os.unlink", MagicMock()), \
                patch("os.ftruncate", ftruncate_mock):
            if raise_msg:
                self.assertRaisesRegexp(
                    Exception,
                    raise_msg,
                    metalk8s_volumes.create,
                    name
                )
            else:
                # This function does not return anything
                metalk8s_volumes.create(name)

    @parameterized.expand(
        param.explicit(kwargs=test_case)
        for test_case in YAML_TESTS_CASES["is_provisioned"]
    )
    def test_is_provisioned(self, name, result, raises=False,
                            pillar_volumes=None, losetup_output=None):
        """
        Tests the return of `is_provisioned` function
        """
        pillar_dict = {
            'metalk8s': {
                'volumes': pillar_volumes or {}
            }
        }

        if losetup_output is None:
            losetup_cmd_kwargs = {
                'retcode': 1,
                'stderr': 'An error has occurred'
            }
        else:
            losetup_cmd_kwargs = {
                'stdout': losetup_output
            }

        salt_dict = {
            'cmd.run_all': MagicMock(
                return_value=utils.cmd_output(**losetup_cmd_kwargs)
            )
        }

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), \
                patch.dict(metalk8s_volumes.__salt__, salt_dict):
            if raises:
                self.assertRaisesRegexp(
                    Exception,
                    result,
                    metalk8s_volumes.is_provisioned,
                    name
                )
            else:
                self.assertEqual(
                    metalk8s_volumes.is_provisioned(name),
                    result
                )

    @parameterized.expand(
        param.explicit(kwargs=test_case)
        for test_case in YAML_TESTS_CASES["provision"]
    )
    def test_provision(self, name, raise_msg=False,
                       pillar_volumes=None, losetup_output=None):
        """
        Tests the return of `provision` function
        """
        pillar_dict = {
            'metalk8s': {
                'volumes': pillar_volumes or {}
            }
        }

        if losetup_output is None:
            losetup_cmd_kwargs = {
                'retcode': 1,
                'stderr': 'An error has occurred'
            }
        else:
            losetup_cmd_kwargs = {
                'stdout': losetup_output
            }

        salt_dict = {
            'cmd.run_all': MagicMock(
                return_value=utils.cmd_output(**losetup_cmd_kwargs)
            )
        }

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), \
                patch.dict(metalk8s_volumes.__salt__, salt_dict):
            if raise_msg:
                self.assertRaisesRegexp(
                    Exception,
                    raise_msg,
                    metalk8s_volumes.provision,
                    name
                )
            else:
                # This function does not return anything
                metalk8s_volumes.provision(name)

    @parameterized.expand(
        param.explicit(kwargs=test_case)
        for test_case in YAML_TESTS_CASES["is_formatted"]
    )
    def test_is_formatted(self, name, result, raises=False,
                          uuid_return=None, pillar_volumes=None):
        """
        Tests the return of `is_formatted` function
        """
        pillar_dict = {
            'metalk8s': {
                'volumes': pillar_volumes or {}
            }
        }

        get_blkid_mock = MagicMock()
        probe_mock = get_blkid_mock.return_value.__enter__.return_value.probe
        probe_mock.return_value.uuid = uuid_return

        utils_dict = {
            'metalk8s_volumes.get_superblock_flags': MagicMock(),
            'metalk8s_volumes.get_blkid_probe': get_blkid_mock
        }

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), \
                patch.dict(metalk8s_volumes.__utils__, utils_dict):
            if raises:
                self.assertRaisesRegexp(
                    Exception,
                    result,
                    metalk8s_volumes.is_formatted,
                    name
                )
            else:
                self.assertEqual(
                    metalk8s_volumes.is_formatted(name),
                    result
                )

    @parameterized.expand(
        param.explicit(kwargs=test_case)
        for test_case in YAML_TESTS_CASES["format"]
    )
    def test_format(self, name, raise_msg=False,
                    current_fstype=None, has_partition=False,
                    pillar_volumes=None, mkfs_output=None):
        """
        Tests the return of `format` function
        """
        pillar_dict = {
            'metalk8s': {
                'volumes': pillar_volumes or {}
            }
        }

        get_blkid_mock = MagicMock()
        probe_mock = get_blkid_mock.return_value.__enter__.return_value.probe
        probe_mock.return_value.fstype = current_fstype
        probe_mock.return_value.has_partition = has_partition

        utils_dict = {
            'metalk8s_volumes.get_superblock_flags': MagicMock(),
            'metalk8s_volumes.get_blkid_probe': get_blkid_mock
        }

        if mkfs_output is None:
            mkfs_cmd_kwargs = {
                'retcode': 1,
                'stderr': 'An error has occurred'
            }
        else:
            mkfs_cmd_kwargs = {
                'stdout': mkfs_output
            }

        salt_dict = {
            'cmd.run_all': MagicMock(
                return_value=utils.cmd_output(**mkfs_cmd_kwargs)
            )
        }

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), \
                patch.dict(metalk8s_volumes.__salt__, salt_dict), \
                patch.dict(metalk8s_volumes.__utils__, utils_dict):
            if raise_msg:
                self.assertRaisesRegexp(
                    Exception,
                    raise_msg,
                    metalk8s_volumes.format,
                    name
                )
            else:
                # This function does not return anything
                metalk8s_volumes.format(name)

    @parameterized.expand(
        param.explicit(kwargs=test_case)
        for test_case in YAML_TESTS_CASES["is_cleaned_up"]
    )
    def test_is_cleaned_up(self, name, result, raises=False,
                           is_provisioned=False, exists=False,
                           pillar_volumes=None):
        """
        Tests the return of `is_cleaned_up` function
        """
        pillar_dict = {
            'metalk8s': {
                'volumes': pillar_volumes or {}
            }
        }

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), \
                patch.object(metalk8s_volumes.SparseLoopDevice,
                             'is_provisioned',
                             is_provisioned), \
                patch.object(metalk8s_volumes.SparseLoopDevice,
                             'exists',
                             exists):
            if raises:
                self.assertRaisesRegexp(
                    Exception,
                    result,
                    metalk8s_volumes.is_cleaned_up,
                    name
                )
            else:
                self.assertEqual(
                    metalk8s_volumes.is_cleaned_up(name),
                    result
                )

    @parameterized.expand(
        param.explicit(kwargs=test_case)
        for test_case in YAML_TESTS_CASES["clean_up"]
    )
    def test_clean_up(self, name, raise_msg=False, pillar_volumes=None,
                      remove_error=None, ioctl_error=None):
        """
        Tests the return of `clean_up` function
        """
        pillar_dict = {
            'metalk8s': {
                'volumes': pillar_volumes or {}
            }
        }

        remove_mock = MagicMock()
        if remove_error:
            if not isinstance(remove_error, list):
                remove_error = [remove_error]
            remove_mock.side_effect = OSError(*remove_error)

        ioctl_mock = MagicMock()
        if ioctl_error:
            ioctl_mock.side_effect = IOError(ioctl_error)

        with patch.dict(metalk8s_volumes.__pillar__, pillar_dict), \
                patch("os.open", MagicMock()), \
                patch("os.remove", remove_mock), \
                patch("fcntl.ioctl", ioctl_mock):
            if raise_msg:
                self.assertRaisesRegexp(
                    Exception,
                    raise_msg,
                    metalk8s_volumes.clean_up,
                    name
                )
            else:
                # This function does not return anything
                metalk8s_volumes.clean_up(name)
