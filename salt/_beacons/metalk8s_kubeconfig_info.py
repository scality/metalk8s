# -*- coding: utf-8 -*-

import logging
import six

__virtualname__ = "metalk8s_kubeconfig_info"

DEFAULT_NOTIFY_DAYS = 45
BASE_ERROR_MSG = f"Configuration for {__virtualname__} beacon is invalid"

log = logging.getLogger(__name__)


def __virtual__():
    return __virtualname__


def _config_error(msg):
    return False, f"{BASE_ERROR_MSG}: {msg}"


def _flatten_config(config):
    flat_config = {}

    for element in config:
        flat_config.update(element)

    return flat_config


def validate(config):
    if not isinstance(config, list):
        return _config_error("it must be a list")

    _config = _flatten_config(config)

    if "files" not in _config:
        return _config_error("it must include 'files' key")

    if not isinstance(_config["files"], list):
        return _config_error("'files' key must be a list")

    for element in _config["files"]:
        if isinstance(element, dict):
            if len(element) != 1:
                return _config_error(
                    "dict element in 'files' can only contain a single key"
                )
        elif isinstance(element, six.string_types):
            continue
        else:
            return _config_error("elements in 'files' can only be dicts and/or strings")

    return True, "Valid beacon configuration"


def beacon(config):
    """
    Watch the configured kubeconfig list
    """
    ret = []
    certificates = []

    _config = _flatten_config(config)

    ca_minion = __pillar__["metalk8s"]["ca"]["minion"]
    b64_ca_cert = __salt__["mine.get"](ca_minion, "kubernetes_root_ca_b64")[ca_minion]

    notify_days = _config.get("notify_days", DEFAULT_NOTIFY_DAYS)

    for kubeconfig in _config["files"]:
        if isinstance(kubeconfig, dict):
            cert_path = next(iter(kubeconfig))
            days_remaining = kubeconfig[cert_path].get("notify_days", notify_days)
        else:
            cert_path = kubeconfig
            days_remaining = notify_days

        if not __salt__["metalk8s_kubeconfig.validate"](
            cert_path, b64_ca_cert, days_remaining=days_remaining
        ):
            log.info("kubeconfig %s needs to be regenerated", cert_path)
            certificates.append({"cert_path": cert_path})
        else:
            log.debug("kubeconfig %s is up to date", cert_path)

    if certificates:
        ret.append({"certificates": certificates})

    return ret
