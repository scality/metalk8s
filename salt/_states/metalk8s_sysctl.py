# -*- coding: utf-8 -*-
"""
Custom state to handle MetalK8s sysctl.
"""

from salt.exceptions import CommandExecutionError

__virtualname__ = "metalk8s_sysctl"


def __virtual__():
    if "sysctl.present" not in __states__:
        return (False, "sysctl state module could not be loaded")
    return __virtualname__


def present(name, value, config=None, check_priority=True, strict=False):
    """
    Wrapper around `sysctl.present` state module adding a check of
    the sysctl parameter priority if `check_priority` is `True`.
    If `strict` is set to `True`, check that the passed `config` is
    the last file to define this `value`.
    """
    if config is None:
        config = __salt__["sysctl.default_config"]()

    if check_priority:
        try:
            __salt__["metalk8s_sysctl.has_precedence"](name, value, config, strict)
        except CommandExecutionError as exc:
            return {
                "name": name,
                "result": False,
                "changes": {},
                "comment": f"Unable to set sysctl value: {exc}",
            }

    return __states__["sysctl.present"](name, value, config)
