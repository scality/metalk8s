"""Unit tests for metalk8s_sysctl execution module"""

import os.path

import yaml

from salt.exceptions import CommandExecutionError

from tests.unit import mixins
from tests.unit import utils
from pyfakefs.fake_filesystem_unittest import TestCase

from _modules import metalk8s_sysctl

YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_sysctl.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)

FILESYSTEM_TREE = YAML_TESTS_CASES["filesystem_tree"]


class Metalk8sSysctlTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_sysctl` module
    """

    loader_module = metalk8s_sysctl

    def setUp(self):
        self.setUpPyfakefs()

        for path, content in FILESYSTEM_TREE.items():
            self.fs.create_file(path, contents=content)

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_sysctl.__virtual__(), "metalk8s_sysctl")

    @utils.parameterized_from_cases(YAML_TESTS_CASES["has_precedence"])
    def test_has_precedence(self, name, value, config, result=None, strict=False):
        """
        Tests the return of `has_precedence` function
        """
        if result:
            self.assertRaisesRegex(
                CommandExecutionError,
                result,
                metalk8s_sysctl.has_precedence,
                name,
                value,
                config,
                strict,
            )
        else:
            self.assertEqual(
                metalk8s_sysctl.has_precedence(name, value, config, strict),
                None,
            )
