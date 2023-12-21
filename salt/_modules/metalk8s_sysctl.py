# -*- coding: utf-8 -*-
"""
Execution module to handle MetalK8s sysctl.
"""

import configparser
import pathlib

from salt.exceptions import CommandExecutionError
import salt.utils.files

__virtualname__ = "metalk8s_sysctl"

# Order in this list defines the precedence
SYSCTL_CFG_DIRECTORIES = [
    "/run/sysctl.d",
    "/etc/sysctl.d",
    "/usr/local/lib/sysctl.d",
    "/usr/lib/sysctl.d",
    "/lib/sysctl.d",
]
# This file is applied last no matter what
SYSCTL_DEFAULT_CFG = "/etc/sysctl.conf"


def __virtual__():
    return __virtualname__


def _get_sysctl_files(config):
    """
    Return all the sysctl configuration files ordered as they are
    read by the system.
    Inject the configuration file passed in argument `config` in this
    list, in case this file does not exist yet.
    If the `config` file is not in an authorized path (see `SYSCTL_FILE_GLOBS`
    and `SYSCTL_DEFAULT_CFG`) or is overwritten by a file with the same name
    but higher precedence, it is ignored as the system will not take care
    of it anyway.
    """
    config_path = pathlib.Path(config).resolve()
    files = {}

    for directory in SYSCTL_CFG_DIRECTORIES:
        path = pathlib.Path(directory)
        if path == config_path.parent:
            files.setdefault(config_path.name, str(config_path))

        for cfg in path.glob("*.conf"):
            files.setdefault(cfg.name, str(cfg))

    sorted_files = [files[name] for name in sorted(files)]
    sorted_files.append(SYSCTL_DEFAULT_CFG)

    return sorted_files


def has_precedence(name, value, config, strict=False):
    """
    Read all sysctl configuration file to check if the passed `name` and
    `value` are not overwritten by an already existing sysctl configuration
    file.
    If `strict` is set, check that the final value comes from the passed
    `config` and not another sysctl configuration file (even if the value is
    equal to `value`).
    """
    sysctl_files = _get_sysctl_files(config)

    # Ignore files before the `config` one.
    try:
        sysctl_files = sysctl_files[sysctl_files.index(config) + 1 :]
    except ValueError:
        # If the file is not in the list, it means it's overwritten by an
        # other sysctl configuration file with higher precedence.
        config_name = pathlib.PurePath(config).name
        for sysctl_file in sysctl_files:
            sysctl_name = pathlib.PurePath(sysctl_file).name
            if sysctl_name == config_name:
                raise CommandExecutionError(  # pylint: disable=raise-missing-from
                    f"'{sysctl_file}' has a higher precedence and overrides '{config}'"
                )

        # The target file is not in a directory checked by the system
        raise CommandExecutionError(  # pylint: disable=raise-missing-from
            f"{config} is not a correct path for a sysctl configuration "
            "file, please use one of the following:\n- "
            + "\n- ".join(SYSCTL_CFG_DIRECTORIES)
        )

    parser = configparser.ConfigParser(interpolation=None)
    epured_value = " ".join(str(value).split())

    for sysctl_file in sysctl_files:
        with salt.utils.files.fopen(sysctl_file, "r") as sysctl_fd:
            parser.read_file(["[global]", *sysctl_fd], source=sysctl_file)
        sysctl = dict(parser.items("global"))
        parser.remove_section("global")
        if name in sysctl and (
            strict or " ".join(sysctl[name].split()) != epured_value
        ):
            raise CommandExecutionError(
                f"'{sysctl_file}' redefines '{name}' with value '{sysctl[name]}'"
            )
