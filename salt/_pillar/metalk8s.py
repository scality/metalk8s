import logging
from collections.abc import Mapping

import salt.utils.dictupdate
import salt.utils.files
import salt.utils.yaml


log = logging.getLogger(__name__)


EXPECTED_APIVERSIONS = [
    "metalk8s.scality.com/v1alpha2",
    "metalk8s.scality.com/v1alpha3",
]

DEFAULT_POD_NETWORK = "10.233.0.0/16"
DEFAULT_SERVICE_NETWORK = "10.96.0.0/12"
DEFAULT_MTU = 1460


def _load_config(path):
    log.debug("Loading MetalK8s configuration from %s", path)

    config = None
    try:
        with salt.utils.files.fopen(path, "rb") as fd:
            config = salt.utils.yaml.safe_load(fd) or {}
    except Exception as exc:  # pylint: disable=broad-except
        return __utils__["pillar_utils.errors_to_dict"](
            ["Failed to load {}: {}".format(path, exc)]
        )
    if not config:
        error_tplt = "Invalid BootstrapConfiguration at {}"
        return __utils__["pillar_utils.errors_to_dict"]([error_tplt.format(path)])

    expected = {"kind": "BootstrapConfiguration"}

    errors = __utils__["pillar_utils.assert_equals"](config, expected) + __utils__[
        "pillar_utils.assert_keys"
    ](config, ["archives"])

    if config["apiVersion"] not in EXPECTED_APIVERSIONS:
        errors.append(
            "Expected one of '{}' for apiVersion, got '{}'".format(
                "', '".join(EXPECTED_APIVERSIONS), config["apiVersion"]
            )
        )

    if errors:
        return __utils__["pillar_utils.errors_to_dict"](errors)

    return config


def _load_networks(config_data):
    errors = __utils__["pillar_utils.assert_keys"](config_data, ["networks"])
    if errors:
        return __utils__["pillar_utils.errors_to_dict"](errors)

    networks_data = config_data["networks"]
    if not isinstance(networks_data, Mapping):
        return __utils__["pillar_utils.errors_to_dict"](
            [
                "Invalid network format in config file, mapping expected got {}".format(
                    networks_data
                )
            ]
        )
    errors = __utils__["pillar_utils.assert_keys"](
        networks_data, ["controlPlane", "workloadPlane"]
    )
    if errors:
        return __utils__["pillar_utils.errors_to_dict"](errors)

    for net in ["controlPlane", "workloadPlane"]:
        if config_data["apiVersion"] == "metalk8s.scality.com/v1alpha2":
            networks_data[net] = {"cidr": [networks_data[net]]}

        elif config_data["apiVersion"] == "metalk8s.scality.com/v1alpha3":
            if not isinstance(networks_data[net], Mapping):
                errors.append(
                    "Invalid '{}' network format in config file, "
                    "mapping expected got {}".format(net, networks_data[net])
                )
                continue

            if "cidr" not in networks_data[net]:
                errors.append("Invalid '{}' network 'cidr' is mandatory".format(net))

            if not isinstance(networks_data[net]["cidr"], list):
                networks_data[net]["cidr"] = [networks_data[net]["cidr"]]

    # MetalLB disabled by default
    networks_data["controlPlane"].setdefault("metalLB", {}).setdefault("enabled", False)

    if networks_data["controlPlane"]["metalLB"]["enabled"]:
        if not networks_data["controlPlane"].get("ingress", {}).get("ip"):
            errors.append(
                "'ip' for 'ingress' in 'controlPlane' network is mandatory when "
                "'metalLB' is enabled"
            )
        if len(networks_data["controlPlane"]["cidr"]) > 1:
            errors.append(
                "Enabling 'metalLB' requires a single 'cidr' in "
                "'controlPlane' network, see "
                "https://github.com/scality/metalk8s/issues/3502"
            )

    if errors:
        return __utils__["pillar_utils.errors_to_dict"](errors)

    if "mtu" not in networks_data["workloadPlane"]:
        networks_data["workloadPlane"]["mtu"] = DEFAULT_MTU

    return {
        "control_plane": networks_data["controlPlane"],
        "workload_plane": networks_data["workloadPlane"],
        "pod": networks_data.get("pods", DEFAULT_POD_NETWORK),
        "service": networks_data.get("services", DEFAULT_SERVICE_NETWORK),
    }


def _load_ca(config_data):
    errors = __utils__["pillar_utils.assert_keys"](config_data, ["ca"])
    if errors:
        return __utils__["pillar_utils.errors_to_dict"](errors)

    ca_data = config_data["ca"]
    if not isinstance(ca_data, Mapping):
        return __utils__["pillar_utils.errors_to_dict"](
            [
                "Invalid ca format in config file, mapping expected got {}".format(
                    ca_data
                )
            ]
        )

    errors = __utils__["pillar_utils.assert_keys"](ca_data, ["minion"])
    if errors:
        return __utils__["pillar_utils.errors_to_dict"](errors)

    return {
        "minion": ca_data["minion"],
    }


def _load_iso_path(config_data):
    """Load iso path from BootstrapConfiguration"""
    res = config_data["archives"]

    if isinstance(res, str):
        res = [res]

    if not isinstance(res, list):
        return __utils__["pillar_utils.errors_to_dict"](
            [
                "Invalid archives format in config file, list or string expected "
                "got {1}.".format(res)
            ]
        )

    return res


def ext_pillar(minion_id, pillar, bootstrap_config):  # pylint: disable=unused-argument
    config = _load_config(bootstrap_config)
    if config.get("_errors"):
        metal_data = __utils__["pillar_utils.errors_to_dict"](config["_errors"])
        result = {
            "metalk8s": metal_data,
        }

        for key in ["metalk8s"]:
            __utils__["pillar_utils.promote_errors"](result, key)

        return result

    else:
        metal_data = {
            "archives": _load_iso_path(config),
            "ca": _load_ca(config),
            "debug": config.get("debug", False),
        }

        result = {
            "networks": _load_networks(config),
            "metalk8s": metal_data,
            "proxies": config.get("proxies", {}),
            "kubernetes": config.get("kubernetes", {}),
        }

        if not isinstance(metal_data["archives"], list):
            # Special case for archives in pillar
            __utils__["pillar_utils.promote_errors"](metal_data, "archives")
        for key in ["ca"]:
            __utils__["pillar_utils.promote_errors"](metal_data, key)
        for key in ["networks", "metalk8s"]:
            __utils__["pillar_utils.promote_errors"](result, key)

        return result
