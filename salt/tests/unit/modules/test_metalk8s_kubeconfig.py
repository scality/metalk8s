import os.path
import yaml

from unittest import TestCase
from unittest.mock import MagicMock, mock_open, patch

from _modules import metalk8s_kubeconfig

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_kubeconfig.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)
KUBECONFIG = YAML_TESTS_CASES["__kubeconfig"]
CLIENT_CERTIFICATE_CONTENT = YAML_TESTS_CASES["__client_certificate_content"]


class Metalk8sKubeconfigTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_kubeconfig` module
    """

    loader_module = metalk8s_kubeconfig

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_kubeconfig.__virtual__(), "metalk8s_kubeconfig")

    @utils.parameterized_from_cases(YAML_TESTS_CASES["validate"])
    def test_validate(
        self,
        kubeconfig,
        file_mode=0o600,
        client_certificate_content=None,
        verify_signature_result=True,
        verify_private_key_result=True,
        result=False,
    ):
        """
        Tests the return of `validate` function
        """
        os_isfile_mock = MagicMock(return_value=kubeconfig is not None)
        stat_s_imode_mock = MagicMock(return_value=file_mode)
        open_mock = mock_open(
            read_data=yaml.safe_dump(kubeconfig)
            if not isinstance(kubeconfig, str)
            else kubeconfig
        )
        patch_salt_dict = {
            "x509.read_certificate": MagicMock(
                return_value=client_certificate_content
                if client_certificate_content is not None
                else CLIENT_CERTIFICATE_CONTENT
            ),
            "x509.verify_signature": MagicMock(return_value=verify_signature_result),
            "x509.verify_private_key": MagicMock(
                return_value=verify_private_key_result
            ),
        }

        with patch("os.path.isfile", os_isfile_mock), patch(
            "os.stat", MagicMock()
        ), patch("stat.S_IMODE", stat_s_imode_mock), patch.object(
            metalk8s_kubeconfig, "fopen", open_mock
        ), patch.dict(
            metalk8s_kubeconfig.__salt__, patch_salt_dict
        ):
            cluster_info = KUBECONFIG["clusters"][0]["cluster"]
            self.assertEqual(
                metalk8s_kubeconfig.validate(
                    "/etc/kubernetes/admin.conf",
                    cluster_info["certificate-authority-data"],
                    cluster_info["server"],
                    KUBECONFIG["users"][0]["name"],
                ),
                result,
            )
