# -*- coding: utf-8 -*-
"""
Execution module for handling MetalK8s checks.
"""

from salt.exceptions import CheckError

__virtualname__ = 'metalk8s_checks'


def __virtual__():
    return __virtualname__


def sysctl(params, raises=True):
    """Check if the given sysctl key-values match the ones in memory and
    return a string (or raise if `raises` is set to `True`) with the list
    of non-matching parameters.

    Arguments:
        params (dict): the sysctl parameters to check keyed by name and with
            expected values as values.
        raises (bool): the method will raise if there is any non-matching
            sysctl value.
    """
    errors = []

    for key, value in params.items():
        current_value = __salt__["sysctl.get"](key)
        if current_value != str(value):
            errors.append(
                "Incorrect value for sysctl '{0}', expecting '{1}' but "
                "found '{2}'.".format(key, value, current_value)
            )

    error_msg = "\n".join(errors)

    if errors and raises:
        raise CheckError(error_msg)

    return error_msg
