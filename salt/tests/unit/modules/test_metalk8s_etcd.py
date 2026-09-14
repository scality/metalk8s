from importlib import reload
from unittest import TestCase
from unittest.mock import MagicMock, patch

from parameterized import parameterized
from salt.exceptions import CommandExecutionError

from _modules import metalk8s_etcd

from tests.unit import mixins
from tests.unit import utils

# Normalized members as returned by `metalk8s_etcd.get_etcd_member_list`
MEMBERS_LIST_DICT = [
    {
        "client_urls": ["https://10.11.12.13:2379"],
        "id": "17971792102091431977L",
        "name": "bootstrap",
        "peer_urls": ["https://10.11.12.13:2380"],
    },
    {
        "client_urls": ["https://10.11.12.14:2379"],
        "id": "17971792102091431978L",
        "name": "node1",
        "peer_urls": ["https://10.11.12.14:2380", "https://11.11.12.14:2380"],
    },
]
# Raw members as returned by etcd3gw `client.members()` (camelCase keys)
MEMBERS_RAW = [
    {
        "ID": member["id"],
        "name": member["name"],
        "peerURLs": member["peer_urls"],
        "clientURLs": member["client_urls"],
    }
    for member in MEMBERS_LIST_DICT
]


class Metalk8sEtcdTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_etcd` module
    """

    loader_module = metalk8s_etcd

    def test_virtual_success(self):
        """
        Tests the return of `__virtual__` function, success
        """
        reload(metalk8s_etcd)
        self.assertEqual(metalk8s_etcd.__virtual__(), "metalk8s_etcd")

    def test_virtual_fail_import(self):
        """
        Tests the return of `__virtual__` function, unable to import etcd3gw
        """
        with utils.ForceImportErrorOn("etcd3gw"):
            reload(metalk8s_etcd)
            self.assertTupleEqual(
                metalk8s_etcd.__virtual__(), (False, "etcd3gw not available")
            )

    @parameterized.expand(
        [
            (["minion1", "minion2"], {"minion1": "10.11.12.13"}, True, "10.11.12.13"),
            (
                ["minion2"],
                {"minion1": "10.11.12.13", "minion2": "10.11.12.14"},
                True,
                "10.11.12.14",
            ),
            (
                ["minion1", "minion2"],
                {"minion1": "10.11.12.13", "minion2": "10.11.12.14"},
                True,
                "10.11.12.13",
            ),
            (
                ["minion1", "minion2"],
                {"minion1": "10.11.12.13", "minion2": "10.11.12.14"},
                [False, True],
                "10.11.12.14",
            ),
            (
                ["minion1", "minion2"],
                {"minion1": "10.11.12.13", "minion2": "10.11.12.14"},
                False,
                "Unable to find an available etcd member in the cluster",
                True,
            ),
            (
                ["minion2"],
                {"minion1": "10.11.12.13"},
                False,
                "Unable to find an available etcd member in the cluster",
                True,
            ),
            (
                [],
                {"minion1": "10.11.12.13"},
                False,
                "Unable to find an available etcd member in the cluster",
                True,
            ),
            (
                ["minion1"],
                {},
                False,
                "Unable to find an available etcd member in the cluster",
                True,
            ),
        ]
    )
    def test_get_endpoint_up(self, etcd_minions, cp_ips, status, result, raises=False):
        """
        Tests the return of `_get_endpoint_up` function
        """

        def _saltutil_runner_mock(name, **kwargs):
            if name == "mine.get":
                if kwargs.get("fun") == "control_plane_ip":
                    return cp_ips
            return None

        def _etcd_status():
            result = status
            if isinstance(status, list):
                result = status.pop(0)
            if result:
                return True
            else:
                raise Exception("Unhealthy member")

        patch_dict = {
            "saltutil.runner": MagicMock(side_effect=_saltutil_runner_mock),
            "metalk8s.minions_by_role": MagicMock(return_value=etcd_minions),
        }
        etcd3gw_mock = MagicMock()
        etcd3gw_mock.return_value.status.side_effect = _etcd_status
        with patch.dict(metalk8s_etcd.__salt__, patch_dict), patch(
            "etcd3gw.client", etcd3gw_mock
        ), patch("etcd3gw.exceptions.ConnectionFailedError", Exception):
            if raises:
                self.assertRaisesRegex(
                    Exception,
                    result,
                    metalk8s_etcd._get_endpoint_up,
                    "ca",
                    "key",
                    "cert",
                )
            else:
                self.assertEqual(
                    metalk8s_etcd._get_endpoint_up("ca", "key", "cert"), result
                )
                etcd3gw_mock.return_value.status.assert_called()

    @parameterized.expand([(), ("10.11.12.13",)])
    def test_add_etcd_node(self, endpoint=None):
        """
        Tests the return of `add_etcd_node` function
        """
        new_member_raw = {
            "ID": "17971792102091431999L",
            "name": "new-node",
            "peerURLs": ["https://10.11.12.15:2380"],
            "clientURLs": ["https://10.11.12.15:2379"],
        }
        expected = {
            "id": "17971792102091431999L",
            "name": "new-node",
            "peer_urls": ["https://10.11.12.15:2380"],
            "client_urls": ["https://10.11.12.15:2379"],
        }
        etcd3gw_mock = MagicMock()
        etcd3gw_mock.return_value.get_url.side_effect = (
            lambda path: f"https://etcd/v3{path}"
        )
        etcd3gw_mock.return_value.post.return_value = {"member": new_member_raw}
        peer_urls = ["https://10.11.12.15:2380"]
        with patch("etcd3gw.client", etcd3gw_mock), patch.object(
            metalk8s_etcd, "_get_endpoint_up", MagicMock(return_value=endpoint)
        ):
            self.assertEqual(
                metalk8s_etcd.add_etcd_node(
                    peer_urls, None if endpoint else "my_endpoint"
                ),
                expected,
            )
            etcd3gw_mock.return_value.post.assert_called_once_with(
                "https://etcd/v3/cluster/member/add",
                json={"peerURLs": peer_urls},
            )

    @parameterized.expand(
        [
            (["https://10.11.12.13:2380"], MEMBERS_RAW, True),
            (["https://10.11.12.13:2380"], MEMBERS_RAW, True, "10.11.12.13"),
            (["https://10.11.12.13:2381"], MEMBERS_RAW, False),
            ([], MEMBERS_RAW, True),
            ([], [], True),
            (["https://10.11.12.13:2380"], [], False),
            (
                ["https://10.11.12.14:2380", "https://11.11.12.14:2380"],
                MEMBERS_RAW,
                True,
            ),
            (
                ["https://10.11.12.14:2380", "https://11.11.12.14:2380"],
                MEMBERS_RAW,
                True,
            ),
            (
                ["https://10.11.12.13:2380", "https://10.11.12.13:2380"],
                MEMBERS_RAW,
                True,
            ),
            (
                ["https://10.11.12.14:2380", "https://10.11.12.14:2381"],
                MEMBERS_RAW,
                False,
            ),
        ]
    )
    def test_urls_exist_in_cluster(self, peer_urls, members, result, endpoint=None):
        """
        Tests the return of `urls_exist_in_cluster` function
        """
        etcd3gw_mock = MagicMock()
        etcd3gw_mock.return_value.members.return_value = members
        with patch("etcd3gw.client", etcd3gw_mock), patch.object(
            metalk8s_etcd, "_get_endpoint_up", MagicMock(return_value=endpoint)
        ):
            self.assertEqual(
                metalk8s_etcd.urls_exist_in_cluster(
                    peer_urls, None if endpoint else "my_endpoint"
                ),
                result,
            )

    @parameterized.expand(
        [
            (
                {"minion1": "https://10.11.12.13:2380"},
                None,
                MEMBERS_RAW,
                True,
                "cluster is healthy",
                False,
            ),
            (
                None,
                "https://10.11.12.13:2380",
                MEMBERS_RAW,
                True,
                "cluster is healthy",
                False,
            ),
            (
                None,
                "https://10.11.12.13:2380",
                MEMBERS_RAW,
                [True, False],
                "cluster is degraded",
                True,
            ),
            (
                None,
                "https://10.11.12.13:2380",
                MEMBERS_RAW,
                False,
                "cluster is unavailable",
                True,
            ),
            (
                None,
                "https://10.11.12.13:2380",
                [],
                False,
                "cluster is unavailable",
                True,
            ),
        ]
    )
    def test_check_etcd_health(self, cp_ips, endpoint, members, status, result, raises):
        """
        Tests the return of `check_etcd_health` function
        """

        def _saltutil_runner_mock(name, **kwargs):
            if name == "mine.get":
                if kwargs.get("fun") == "control_plane_ip":
                    return cp_ips
            return None

        def _etcd_status():
            result = status
            if isinstance(status, list):
                result = status.pop(0)
            if result:
                return True
            else:
                raise Exception("Unhealthy member")

        etcd3gw_mock = MagicMock()
        etcd3gw_mock.return_value.members.return_value = members
        etcd3gw_mock.return_value.status.side_effect = _etcd_status

        patch_dict = {"saltutil.runner": MagicMock(side_effect=_saltutil_runner_mock)}
        with patch.dict(metalk8s_etcd.__salt__, patch_dict), patch(
            "etcd3gw.client", etcd3gw_mock
        ), patch.object(
            metalk8s_etcd, "_get_endpoint_up", MagicMock(return_value=endpoint)
        ):
            minion_id = "minion1" if cp_ips else None
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_etcd.check_etcd_health,
                    minion_id,
                    ca_cert="ca",
                    cert_key="key",
                    cert_cert="cert",
                )
            else:
                self.assertEqual(
                    metalk8s_etcd.check_etcd_health(
                        minion_id, ca_cert="ca", cert_key="key", cert_cert="cert"
                    ),
                    result,
                )
            etcd3gw_mock.assert_any_call(
                host=cp_ips[minion_id] if minion_id else endpoint,
                port=2379,
                protocol="https",
                ca_cert="ca",
                cert_key="key",
                cert_cert="cert",
                timeout=30,
            )

    @parameterized.expand(
        [
            (MEMBERS_RAW, MEMBERS_LIST_DICT),
            (MEMBERS_RAW, MEMBERS_LIST_DICT, "10.11.12.13"),
            (MEMBERS_RAW, [], Exception("No endpoint up")),
            ([], []),
            ([], [], "10.11.12.13"),
        ]
    )
    def test_get_etcd_member_list(self, members, result, endpoint=None):
        """
        Tests the return of `get_etcd_member_list` function
        """

        def _get_endpoint(*args, **kwargs):
            if isinstance(endpoint, Exception):
                raise endpoint
            return endpoint

        etcd3gw_mock = MagicMock()
        etcd3gw_mock.return_value.members.return_value = members

        with patch("etcd3gw.client", etcd3gw_mock), patch.object(
            metalk8s_etcd, "_get_endpoint_up", MagicMock(side_effect=_get_endpoint)
        ):
            self.assertEqual(
                metalk8s_etcd.get_etcd_member_list(None if endpoint else "my_endpoint"),
                result,
            )
