import os.path
from unittest import TestCase
from unittest.mock import MagicMock, patch

import yaml

from _modules import metalk8s_backups

from tests.unit import mixins
from tests.unit import utils

YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_backups.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sBackupsTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_backups` module
    """

    loader_module = metalk8s_backups

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_backups.__virtual__(), "metalk8s_backups")

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_backups_to_delete"])
    def test_get_backups_to_delete(
        self, backup_archives, retcode, retention_count, expected
    ):
        """
        Tests the return of `get_backups_to_delete` function
        """
        listdir_ret = {"retcode": retcode, "stdout": "\n".join(backup_archives)}
        listdir_mock = MagicMock(return_value=listdir_ret)
        with patch.dict(
            metalk8s_backups.__salt__,
            {"cmd.run_all": listdir_mock},
        ):
            self.assertEqual(
                metalk8s_backups.get_backups_to_delete(
                    "backup_folder", retention_count
                ),
                expected,
            )
            listdir_mock.assert_called_once_with('ls -t "backup_folder"/*.tar.gz')
