# -*- coding: utf-8 -*-

from base64 import b64decode
import binascii
from datetime import datetime, timedelta
import os
import stat
import yaml

from salt.utils.files import fopen

__virtualname__ = "metalk8s_kubeconfig"


def __virtual__():
    return __virtualname__


def validate(
    filename,
    expected_ca_data=None,
    expected_api_server=None,
    expected_cn=None,
    days_remaining=90,
):
    """Validate a kubeconfig filename.

    Validate that the kubeconfig provided by filename
    is conform with config.

    This function is used for managed idempotency.

    :return: True if the kubeconfig file matches expectation
             False otherwise (ie need to be regenerated)
    """
    # Verify if the file exists
    if not os.path.isfile(filename):
        return False

    # Verify that the mode is 600
    if stat.S_IMODE(os.stat(filename).st_mode) != 0o600:
        return False

    try:
        with fopen(filename, "r") as fd:
            kubeconfig = yaml.safe_load(fd)
    except Exception:  # pylint: disable=broad-except
        return False

    # Verify that the current CA cert on disk matches the expected CA cert
    # and the API Server on the existing file match with the expected
    try:
        cluster_info = kubeconfig["clusters"][0]["cluster"]
        current_ca_data = (
            cluster_info["certificate-authority-data"].strip().replace("\n", "")
        )
        current_api_server = cluster_info["server"]
    except (KeyError, IndexError):
        return False

    expected_ca_data = expected_ca_data.strip().replace("\n", "")
    if expected_ca_data and current_ca_data != expected_ca_data:
        return False

    if expected_api_server and current_api_server != expected_api_server:
        return False

    # Client Key and certificate verification
    try:
        b64_client_key = kubeconfig["users"][0]["user"]["client-key-data"]
        b64_client_cert = kubeconfig["users"][0]["user"]["client-certificate-data"]
    except (KeyError, IndexError):
        return False

    try:
        client_key = b64decode(b64_client_key).decode()
        client_cert = b64decode(b64_client_cert).decode()
    except (TypeError, binascii.Error):
        return False

    ca_pem_cert = b64decode(current_ca_data).decode()

    client_cert_detail = __salt__["x509.read_certificate"](client_cert)

    # Verify client cn
    if expected_cn is not None:
        try:
            current_cn = client_cert_detail["Subject"]["CN"]
        except KeyError:
            return False
        else:
            if current_cn != expected_cn:
                return False

    # Verify client client cert expiration date is > 30days
    try:
        expiration_date = client_cert_detail["Not After"]
    except KeyError:
        return False
    else:
        if (
            datetime.strptime(expiration_date, "%Y-%m-%d %H:%M:%S")
            - timedelta(days=days_remaining)
            < datetime.now()
        ):
            return False

    if __salt__["x509.verify_signature"](client_cert, ca_pem_cert) is not True:
        return False

    if __salt__["x509.verify_private_key"](client_key, client_cert) is not True:
        return False

    return True
