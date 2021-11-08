from unittest import TestCase
from unittest.mock import MagicMock, patch

from parameterized import parameterized
import salt
from salt.exceptions import CommandExecutionError

from _modules import metalk8s_cordon

from tests.unit import mixins


class Metalk8sCordonTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_cordon` module
    """

    loader_module = metalk8s_cordon

    def node_object(self, unschedulable=None, with_taints=False):
        node_obj_dict = {
            "api_version": "v1",
            "kind": "Node",
            "metadata": {"name": "bootstrap"},
            "spec": {
                "taints": [
                    {"effect": "NoSchedule", "key": "node-role.kubernetes.io/bootstrap"}
                ],
                "unschedulable": unschedulable,
            },
        }
        if with_taints:
            node_obj_dict["spec"]["taints"].append(
                {"effect": "NoSchedule", "key": "node.kubernetes.io/unschedulable"}
            )
        return node_obj_dict

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_cordon.__virtual__(), "metalk8s_kubernetes")

    def test_check_deps_success(self):
        """
        Tests the availability of `metalk8s_kubernetes.update_object` module
        in salt
        """
        with patch.dict(
            metalk8s_cordon.__salt__, {"metalk8s_kubernetes.update_object": MagicMock()}
        ):
            metalk8s_cordon._check_deps()

    def test_check_deps_fail(self):
        """
        Tests the unavailability of `metalk8s_kubernetes.update_object` module
        in salt
        """
        self.assertRaisesRegex(
            CommandExecutionError,
            "'metalk8s_kubernetes.update_object' is not available",
            metalk8s_cordon._check_deps,
        )

    @parameterized.expand(
        [
            (None,),
            (True,),
            (False,),
        ]
    )
    def test_cordon_node(self, unschedulable):
        """
        Tests the return of `cordon_node` function
        """
        node_obj = self.node_object(unschedulable=unschedulable)

        def _update_object_mock(patch, **_):
            return salt.utils.dictupdate.update(node_obj, patch)

        node_update_mock = MagicMock(side_effect=_update_object_mock)
        salt_dict = {"metalk8s_kubernetes.update_object": node_update_mock}
        with patch.dict(metalk8s_cordon.__salt__, salt_dict):
            self.assertEqual(
                self.node_object(unschedulable=True),
                metalk8s_cordon.cordon_node(
                    node_name="bootstrap",
                ),
            )
            node_update_mock.assert_called()

    @parameterized.expand(
        [
            (None,),
            (True,),
            (False,),
            (True, True),
        ]
    )
    def test_uncordon_node(self, unschedulable, with_taints=False):
        """
        Tests the return of `uncordon_node` function
        """
        node_obj = self.node_object(
            unschedulable=unschedulable, with_taints=with_taints
        )

        def _update_object_mock(patch, **_):
            return salt.utils.dictupdate.update(node_obj, patch)

        get_object_mock = MagicMock(return_value=node_obj)
        node_update_mock = MagicMock(side_effect=_update_object_mock)

        salt_dict = {
            "metalk8s_kubernetes.get_object": get_object_mock,
            "metalk8s_kubernetes.update_object": node_update_mock,
        }
        with patch.dict(metalk8s_cordon.__salt__, salt_dict):
            self.assertEqual(
                self.node_object(unschedulable=False),
                metalk8s_cordon.uncordon_node(
                    node_name="bootstrap",
                ),
            )
            node_update_mock.assert_called()
