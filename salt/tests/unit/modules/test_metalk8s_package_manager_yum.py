import os.path
import yaml

from parameterized import param, parameterized

from salt.exceptions import CommandExecutionError

from salttesting.mixins import LoaderModuleMockMixin
from salttesting.unit import TestCase
from salttesting.mock import MagicMock, patch
from salttesting.helpers import ForceImportErrorOn

from tests.unit import utils

import metalk8s_package_manager_yum


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "files", "test_metalk8s_package_manager_yum.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sPackageManagerYumTestCase(TestCase, LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_package_manager_yum` module
    """
    loader_module = metalk8s_package_manager_yum
    loader_module_globals = {
        "__grains__": {
            "os_family": "RedHat"
        }
    }

    def test_virtual_success(self):
        """
        Tests the return of `__virtual__` function, success
        """
        reload(metalk8s_package_manager_yum)
        self.assertEqual(
            metalk8s_package_manager_yum.__virtual__(),
            'metalk8s_package_manager'
        )

    def test_virtual_fail_import(self):
        """
        Tests the return of `__virtual__` function, unable to import yum
        """
        with patch.dict(metalk8s_package_manager_yum.__grains__,
                        {'os_family': 'Debian'}):
            reload(metalk8s_package_manager_yum)
            self.assertEqual(
                metalk8s_package_manager_yum.__virtual__(),
                False
            )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["list_dependents"])
    def test_list_dependents(self, repoquery_output, result, **kwargs):
        """
        Tests the return of `_list_dependents` function
        """
        if repoquery_output is None:
            repoquery_cmd_kwargs = {
                'retcode': 1,
                'stderr': 'An error has occured'
            }
        else:
            repoquery_cmd_kwargs = {
                'stdout': repoquery_output
            }

        repoquery_cmd_mock = MagicMock(
            return_value=utils.cmd_output(**repoquery_cmd_kwargs)
        )

        with patch.dict(metalk8s_package_manager_yum.__salt__,
                        {'cmd.run_all': repoquery_cmd_mock}):
            self.assertEqual(
                metalk8s_package_manager_yum._list_dependents(
                    "my_package",
                    "1.2.3",
                    **kwargs
                ),
                result
            )
            repoquery_cmd_mock.assert_called_once()
            self.assertEqual(
                repoquery_cmd_mock.call_args[0][0][0],
                "repoquery"
            )
            if "fromrepo" in kwargs:
                self.assertIn(
                    kwargs["fromrepo"],
                    repoquery_cmd_mock.call_args[0][0]
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["list_pkg_dependents"])
    def test_list_pkg_dependents(self, result,
                                 list_dependents=None, rpm_qa_outputs=None,
                                 **kwargs):
        """
        Tests the return of `list_pkg_dependents` function
        """
        def _rpm_qa_cmd(command):
            out_kwargs = {}
            if command[0] == 'rpm' and command[1] == '-qa':
                # rpm_qa_outputs == None means nothings installed so
                # `rpm -qa <package>` return "" and retcode 0
                if rpm_qa_outputs is not None:
                    if isinstance(rpm_qa_outputs, dict):
                        if rpm_qa_outputs.get(command[2]) is None:
                            out_kwargs['retcode'] = 1
                            out_kwargs['stderr'] = 'An error has occured'
                        else:
                            out_kwargs['stdout'] = rpm_qa_outputs[command[2]]
                    else:
                        out_kwargs['stdout'] = rpm_qa_outputs
                return utils.cmd_output(**out_kwargs)
            return None

        salt_dict = {
            'cmd.run_all': MagicMock(side_effect=_rpm_qa_cmd)
        }
        list_dependents_mock = MagicMock(
            return_value={} if list_dependents is None else list_dependents
        )

        with patch.dict(metalk8s_package_manager_yum.__salt__, salt_dict), \
                patch("metalk8s_package_manager_yum._list_dependents",
                      list_dependents_mock):
            self.assertEqual(
                metalk8s_package_manager_yum.list_pkg_dependents(
                    kwargs.pop("name", "my_package"),
                    **kwargs
                ),
                result
            )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["check_pkg_availability"])
    def test_check_pkg_availability(self, pkgs_info, raise_msg=None,
                                    yum_install_retcode=0):
        """
        Tests the return of `check_pkg_availability` function
        """
        def _yum_install_cmd(command):
            out_kwargs = {'stdout': 'Everything looks good'}
            if isinstance(yum_install_retcode, int):
                out_kwargs['retcode'] = yum_install_retcode
            elif isinstance(yum_install_retcode, list):
                out_kwargs['retcode'] = yum_install_retcode.pop()
            elif isinstance(yum_install_retcode, dict):
                # `command[2]` == package name
                out_kwargs['retcode'] = yum_install_retcode.get(command[2], 0)

            if out_kwargs.get('retcode'):
                out_kwargs['stdout'] = 'Oh ! No ! An ErRoR'

            return utils.cmd_output(**out_kwargs)

        salt_dict = {
            'cmd.run_all': MagicMock(side_effect=_yum_install_cmd)
        }

        with patch.dict(metalk8s_package_manager_yum.__salt__, salt_dict):
            if raise_msg:
                self.assertRaisesRegexp(
                    CommandExecutionError,
                    raise_msg,
                    metalk8s_package_manager_yum.check_pkg_availability,
                    pkgs_info
                )
            else:
                # This function does not return anything
                metalk8s_package_manager_yum.check_pkg_availability(
                    pkgs_info
                )
