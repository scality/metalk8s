import ipaddress
import os.path
from unittest import TestCase
from unittest.mock import MagicMock, patch

from parameterized import parameterized
from salt.exceptions import CommandExecutionError
import yaml

from _modules import metalk8s_network

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_network.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sNetworkTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_network` module
    """

    loader_module = metalk8s_network
    loader_module_globals = {"__pillar__": {"networks": {"service": "10.0.0.0/8"}}}

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_network.__virtual__(), "metalk8s_network")

    def test_get_kubernetes_service_ip_success(self):
        """
        Tests the return of `get_kubernetes_service_ip` function, success
        """
        self.assertEqual(metalk8s_network.get_kubernetes_service_ip(), "10.0.0.1")

    @parameterized.expand(
        [
            (None, 'Pillar key "networks:service" must be set.'),
            ("10.0.0.0/32", "Could not obtain an IP in the network range 10.0.0.0/32"),
        ]
    )
    def test_get_kubernetes_service_ip_raise(self, service_ip, error_msg):
        """
        Tests the return of `get_kubernetes_service_ip` function, when raising
        """
        with patch.dict(
            metalk8s_network.__pillar__, {"networks": {"service": service_ip}}
        ):
            self.assertRaisesRegex(
                CommandExecutionError,
                error_msg,
                metalk8s_network.get_kubernetes_service_ip,
            )

    def test_get_cluster_dns_ip_success(self):
        """
        Tests the return of `get_cluster_dns_ip` function, success
        """
        self.assertEqual(metalk8s_network.get_cluster_dns_ip(), "10.0.0.10")

    @parameterized.expand(
        [
            (None, 'Pillar key "networks:service" must be set.'),
            ("10.0.0.0/31", "Could not obtain an IP in the network range 10.0.0.0/31"),
        ]
    )
    def test_get_cluster_dns_ip_raise(self, service_ip, error_msg):
        """
        Tests the return of `get_cluster_dns_ip` function, when raising
        """
        with patch.dict(
            metalk8s_network.__pillar__, {"networks": {"service": service_ip}}
        ):
            self.assertRaisesRegex(
                CommandExecutionError, error_msg, metalk8s_network.get_cluster_dns_ip
            )

    def test_get_oidc_service_ip_success(self):
        """
        Tests the return of `get_oidc_service_ip` function, success
        """
        self.assertEqual(metalk8s_network.get_oidc_service_ip(), "10.0.0.7")

    @parameterized.expand(
        [
            (None, 'Pillar key "networks:service" must be set.'),
            ("10.0.0.0/32", "Could not obtain an IP in the network range 10.0.0.0/32"),
        ]
    )
    def test_get_oidc_service_ip_raise(self, service_ip, error_msg):
        """
        Tests the return of `get_oidc_service_ip` function, when raising
        """
        with patch.dict(
            metalk8s_network.__pillar__, {"networks": {"service": service_ip}}
        ):
            self.assertRaisesRegex(
                CommandExecutionError, error_msg, metalk8s_network.get_oidc_service_ip
            )

    @parameterized.expand(
        [
            # 1 CIDR, 2 IP, take the first one
            (["10.200.0.0/16"], ["10.200.0.1", "10.200.0.42"], "10.200.0.1"),
            # 1 CIDR, 2 IP, current_ip set to the second one, take the second one
            (
                ["10.200.0.0/16"],
                ["10.200.0.1", "10.200.0.42"],
                "10.200.0.42",
                "10.200.0.42",
            ),
            # 1 CIDR, no IP, errors
            (
                ["10.200.0.0/16"],
                [],
                "Unable to find an IP on this host in one of this cidr: 10.200.0.0/16",
                None,
                True,
            ),
            # 2 CIDR, multiple IPs, take the first one of first CIDR
            (
                ["10.200.0.0/16", "10.100.0.0/16"],
                {
                    "10.200.0.0/16": ["10.200.0.1", "10.200.0.42"],
                    "10.100.0.0/16": ["10.100.0.12", "10.100.0.52"],
                },
                "10.200.0.1",
            ),
            # 2 CIDR, multiple IPs, with current_ip present
            (
                ["10.200.0.0/16", "10.100.0.0/16"],
                {
                    "10.200.0.0/16": ["10.200.0.1", "10.200.0.42"],
                    "10.100.0.0/16": ["10.100.0.12", "10.100.0.52"],
                },
                "10.100.0.52",
                "10.100.0.52",
            ),
            # 2 CIDR, multiple IPs, with current_ip absent
            (
                ["10.200.0.0/16", "10.100.0.0/16"],
                {
                    "10.200.0.0/16": ["10.200.0.1", "10.200.0.42"],
                    "10.100.0.0/16": ["10.100.0.12", "10.100.0.52"],
                },
                "10.200.0.1",
                "10.100.0.87",
            ),
            # 2 CIDR, first CIDR no IP
            (
                ["10.200.0.0/16", "10.100.0.0/16"],
                {"10.100.0.0/16": ["10.100.0.12", "10.100.0.52"]},
                "10.100.0.12",
            ),
            # 2 CIDR, no IP, with current_ip, errors
            (
                ["10.200.0.0/16", "10.100.0.0/16"],
                [],
                "Unable to find an IP on this host in one of this cidr: 10.200.0.0/16, 10.100.0.0/16",
                "10.200.0.1",
                True,
            ),
        ]
    )
    def test_get_ip_from_cidrs(
        self, cidrs, ip_addrs, result, current_ip=None, raises=False
    ):
        """
        Tests the return of `get_ip_from_cidrs` function
        """

        def _get_ip_addrs(cidr):
            if isinstance(ip_addrs, dict):
                return ip_addrs.get(cidr)
            return ip_addrs

        salt_dict = {"network.ip_addrs": MagicMock(side_effect=_get_ip_addrs)}

        with patch.dict(metalk8s_network.__salt__, salt_dict):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_network.get_ip_from_cidrs,
                    cidrs=cidrs,
                    current_ip=current_ip,
                )
            else:
                self.assertEqual(
                    result,
                    metalk8s_network.get_ip_from_cidrs(
                        cidrs=cidrs, current_ip=current_ip
                    ),
                )

    @parameterized.expand(
        [
            # Simple test
            (["eth0"], "1500", 1500),
            # Mutliple ifaces (first one taken)
            (["eth1", "eth0"], {"eth0": "1500", "eth1": "1442"}, 1442),
            # No iface, error
            ([], None, 'Unable to get interface for "10.200.0.42"', True),
        ]
    )
    def test_get_mtu_from_ip(self, ifaces, read_mtu, result, raises=False):
        """
        Tests the return of `get_mtu_from_ip` function
        """

        def _read_mtu_file(path):
            if isinstance(read_mtu, dict):
                # path = "/sys/class/net/<iface>/mtu"
                iface = path.split("/")[-2]
                return read_mtu.get(iface, "")
            return read_mtu

        salt_dict = {
            "network.ifacestartswith": MagicMock(return_value=ifaces),
            "file.read": MagicMock(side_effect=_read_mtu_file),
        }

        with patch.dict(metalk8s_network.__salt__, salt_dict):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_network.get_mtu_from_ip,
                    "10.200.0.42",
                )
            else:
                self.assertEqual(
                    result, metalk8s_network.get_mtu_from_ip("10.200.0.42")
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_listening_processes"])
    def test_get_listening_processes(
        self, result, net_conns_ret=None, process_ret=None
    ):
        """
        Tests the return of `get_listening_processes` function
        """
        net_conns_return = []
        for net_conn in net_conns_ret or []:
            sconn_mock = MagicMock()
            sconn_mock.status = net_conn.get("status", "LISTEN")
            sconn_mock.laddr = net_conn.get("laddr")
            sconn_mock.pid = net_conn.get("pid")
            net_conns_return.append(sconn_mock)

        process_return = {}
        for pid, name in (process_ret or {}).items():
            process_return[pid] = MagicMock()
            process_return[pid].name.return_value = name

        net_conns_mock = MagicMock(return_value=net_conns_return)
        process_mock = MagicMock(side_effect=process_return.get)

        with patch("psutil.net_connections", net_conns_mock), patch(
            "psutil.Process", process_mock
        ):
            self.assertEqual(metalk8s_network.get_listening_processes(), result)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["routes"])
    def test_routes(self, ip_route_output, result):
        """
        Tests the return of `routes` function
        """

        def _mock_convert_cidr(cidr):
            ret = {"network": None, "netmask": None, "broadcast": None}
            network_info = ipaddress.ip_network(cidr, strict=False)
            ret["network"] = str(network_info.network_address)
            ret["netmask"] = str(network_info.netmask)
            ret["broadcast"] = str(network_info.broadcast_address)
            return ret

        mock_convert_cidr = MagicMock(side_effect=_mock_convert_cidr)
        mock_ip_cmd = MagicMock(return_value=ip_route_output)
        with patch.dict(
            metalk8s_network.__salt__,
            {"cmd.run": mock_ip_cmd, "network.convert_cidr": mock_convert_cidr},
        ):
            self.assertEqual(metalk8s_network.routes(), result)
            mock_ip_cmd.assert_called_once_with("ip -4 route show table main")

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_control_plane_ingress_ip"])
    def test_get_control_plane_ingress_ip(
        self,
        result,
        raises=False,
        pillar=None,
        opts=None,
        grains=None,
        mine_ret=None,
        mine_runner_ret=None,
    ):
        """
        Tests the return of `get_control_plane_ingress_ip` function
        """
        if pillar is None:
            pillar = {"networks": {"control_plane": {}}}
        if opts is None:
            opts = {"__role": "minion"}
        if grains is None:
            grains = {"id": "my-node"}

        salt_dict = {
            "metalk8s.minions_by_role": MagicMock(return_value=["bootstrap"]),
            "mine.get": MagicMock(return_value=mine_ret),
            "saltutil.runner": MagicMock(return_value=mine_runner_ret),
        }

        with patch.dict(metalk8s_network.__salt__, salt_dict), patch.dict(
            metalk8s_network.__pillar__, pillar
        ), patch.dict(metalk8s_network.__opts__, opts), patch.dict(
            metalk8s_network.__grains__, grains
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_network.get_control_plane_ingress_ip,
                )
            else:
                self.assertEqual(
                    metalk8s_network.get_control_plane_ingress_ip(), result
                )

    @utils.parameterized_from_cases(
        YAML_TESTS_CASES["get_control_plane_ingress_endpoint"]
    )
    def test_get_control_plane_ingress_endpoint(
        self, result, raises=False, cp_ingress_ip_ret=None
    ):
        """
        Tests the return of `get_control_plane_ingress_endpoint` function
        """
        mock_get_cp_ingress_ip = MagicMock(return_value=cp_ingress_ip_ret)
        if raises:
            mock_get_cp_ingress_ip.side_effect = CommandExecutionError(
                cp_ingress_ip_ret
            )

        with patch.dict(
            metalk8s_network.__salt__,
            {"metalk8s_network.get_control_plane_ingress_ip": mock_get_cp_ingress_ip},
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_network.get_control_plane_ingress_endpoint,
                )
            else:
                self.assertEqual(
                    metalk8s_network.get_control_plane_ingress_endpoint(), result
                )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["get_portmap_ips"])
    def test_get_portmap_ips(self, result, cidrs=None, ip_addrs=None, **kwargs):
        """
        Tests the return of `get_portmap_ips` function
        """
        grains = {"metalk8s": {"workload_plane_ip": "10.10.10.10"}}

        def _get_ip_addrs(cidr):
            if isinstance(ip_addrs, dict):
                return ip_addrs.get(cidr)
            return ip_addrs

        salt_dict = {
            "pillar.get": MagicMock(return_value=cidrs),
            "network.ip_addrs": MagicMock(side_effect=_get_ip_addrs),
        }

        with patch.dict(metalk8s_network.__salt__, salt_dict), patch.dict(
            metalk8s_network.__grains__, grains
        ):
            self.assertEqual(result, metalk8s_network.get_portmap_ips(**kwargs))

    @utils.parameterized_from_cases(
        YAML_TESTS_CASES["get_control_plane_ingress_external_ips"]
    )
    def test_get_control_plane_ingress_external_ips(
        self,
        result,
        raises=False,
        cp_ingress_ip_ret=None,
        master_nodes_ret=None,
        mine_ret=None,
    ):
        """
        Tests the return of `get_control_plane_ingress_external_ips` function
        """
        salt_dict = {
            "metalk8s_network.get_control_plane_ingress_ip": MagicMock(
                return_value=cp_ingress_ip_ret
            ),
            "metalk8s.minions_by_role": MagicMock(
                return_value=master_nodes_ret or ["bootstrap"]
            ),
            "saltutil.runner": MagicMock(return_value=mine_ret),
        }

        with patch.dict(metalk8s_network.__salt__, salt_dict):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_network.get_control_plane_ingress_external_ips,
                )
            else:
                self.assertEqual(
                    metalk8s_network.get_control_plane_ingress_external_ips(), result
                )
