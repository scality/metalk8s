import os.path
from unittest import TestCase
from unittest.mock import MagicMock, patch

from parameterized import param, parameterized
from salt.exceptions import CheckError
import salt.utils.versions
import yaml

from _runners import metalk8s_checks

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_checks.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sChecksTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_checks` runner
    """

    loader_module = metalk8s_checks

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_checks.__virtual__(), "metalk8s_checks")

    @utils.parameterized_from_cases(YAML_TESTS_CASES["nodes"])
    def test_nodes(self, result, pillar=None, expect_raise=False, nodes=None, **kwargs):
        """
        Tests the return of `nodes` function
        """

        def cmd_mock(fun, name, **_kwargs):
            if fun == "metalk8s_kubernetes.get_object":
                return nodes.get(name)
            return None

        salt_dict = {"salt.cmd": MagicMock(side_effect=cmd_mock)}

        with patch.dict(metalk8s_checks.__pillar__, pillar or {}), patch.dict(
            metalk8s_checks.__salt__, salt_dict
        ):
            if expect_raise:
                self.assertRaisesRegex(
                    CheckError, result, metalk8s_checks.nodes, **kwargs
                )
            else:
                self.assertEqual(metalk8s_checks.nodes(**kwargs), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["minions"])
    def test_minions(
        self, result, pillar=None, expect_raise=False, ping_ret=None, **kwargs
    ):
        """
        Tests the return of `minions` function
        """
        salt_dict = {"salt.execute": MagicMock(return_value=ping_ret)}

        with patch.dict(metalk8s_checks.__pillar__, pillar or {}), patch.dict(
            metalk8s_checks.__salt__, salt_dict
        ):
            if expect_raise:
                self.assertRaisesRegex(
                    CheckError, result, metalk8s_checks.minions, **kwargs
                )
            else:
                self.assertEqual(metalk8s_checks.minions(**kwargs), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["upgrade"])
    def test_upgrade(
        self,
        result,
        pillar=None,
        expect_raise=False,
        nodes_ret=True,
        minions_ret=True,
        **kwargs
    ):
        """
        Tests the return of `upgrade` function
        """
        nodes_mock = MagicMock(return_value=nodes_ret)
        minions_mock = MagicMock(return_value=minions_ret)

        def cmd_mock(fun, *args, **kwargs):
            if fun == "pkg.version_cmp":
                return salt.utils.versions.version_cmp(*args, **kwargs)
            if fun == "metalk8s.get_from_map":
                return pillar.get("metalk8s")
            return None

        salt_dict = {"salt.cmd": MagicMock(side_effect=cmd_mock)}

        module_mocks = {"nodes": nodes_mock, "minions": minions_mock}

        with patch.multiple(metalk8s_checks, **module_mocks), patch.dict(
            metalk8s_checks.__pillar__, pillar or {}
        ), patch.dict(metalk8s_checks.__salt__, salt_dict):
            if expect_raise:
                self.assertRaisesRegex(
                    CheckError, result, metalk8s_checks.upgrade, **kwargs
                )
            else:
                self.assertEqual(metalk8s_checks.upgrade(**kwargs), result)

            nodes_mock.assert_called_once()
            minions_mock.assert_called_once()
