from parameterized import parameterized

from salt.exceptions import CommandExecutionError

from salttesting.mixins import LoaderModuleMockMixin
from salttesting.unit import TestCase
from salttesting.mock import MagicMock, patch

import metalk8s_network


class Metalk8sNetworkTestCase(TestCase, LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_network` module
    """
    loader_module = metalk8s_network
    loader_module_globals = {
        "__pillar__": {
            "networks": {
                "service": "10.0.0.0/8"
            }
        }
    }

    def test_get_kubernetes_service_ip_success(self):
        """
        Tests the return of `get_kubernetes_service_ip` function, success
        """
        self.assertEqual(
            metalk8s_network.get_kubernetes_service_ip(),
            "10.0.0.1"
        )

    @parameterized.expand([
        (None, 'Pillar key "networks:service" must be set.'),
        (
            '10.0.0.0/32',
            'Could not obtain an IP in the network range 10.0.0.0/32'
        )
    ])
    def test_get_kubernetes_service_ip_raise(self, service_ip, error_msg):
        """
        Tests the return of `get_kubernetes_service_ip` function, when raising
        """
        with patch.dict(
                metalk8s_network.__pillar__,
                {'networks': {'service': service_ip}}):
            self.assertRaisesRegexp(
                CommandExecutionError,
                error_msg,
                metalk8s_network.get_kubernetes_service_ip
            )

    def test_get_cluster_dns_ip_success(self):
        """
        Tests the return of `get_cluster_dns_ip` function, success
        """
        self.assertEqual(metalk8s_network.get_cluster_dns_ip(), "10.0.0.10")

    @parameterized.expand([
        (None, 'Pillar key "networks:service" must be set.'),
        (
            '10.0.0.0/31',
            'Could not obtain an IP in the network range 10.0.0.0/31'
        )
    ])
    def test_get_cluster_dns_ip_raise(self, service_ip, error_msg):
        """
        Tests the return of `get_cluster_dns_ip` function, when raising
        """
        with patch.dict(
                metalk8s_network.__pillar__,
                {'networks': {'service': service_ip}}):
            self.assertRaisesRegexp(
                CommandExecutionError,
                error_msg,
                metalk8s_network.get_cluster_dns_ip
            )
