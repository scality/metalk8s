# -*- coding: utf-8 -*-
"""
State module for handling MetalK8s checks.
"""

from salt.exceptions import CheckError

__virtualname__ = "metalk8s_checks"


def __virtual__():
    return __virtualname__


def run(name, **kwargs):
    """Run an execution module, pretty print the error and fail gracefully if
    the module raises a `CheckError` exception.
    This state does not change anything on the host, it is only used to do
    read-only checks.
    A state module is needed because Salt does not allow to handle well returns
    and exceptions from execution modules in case of failure.

    Arguments:
        name (str): Name of the execution module to run.
    """
    ret = {
        "name": name,
        "changes": {},
        "result": True,
        "comment": "Check succeeded.",
    }

    try:
        result = __salt__[name](**kwargs)
    except KeyError:
        ret["result"] = False
        ret["comment"] = f"Module '{name}' does not exist."
    except CheckError as exc:
        ret["result"] = False
        ret["comment"] = str(exc)

    if result:
        ret["comment"] = result

    return ret
