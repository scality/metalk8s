"""Custom state for managing yum packages and dependencies"""

from __future__ import absolute_import

import logging


log = logging.getLogger(__name__)


__virtualname__ = "metalk8s_package_manager"


def __virtualname__():
    if __grains__['os_family'].lower() == 'redhat':
        return __virtualname__
    return (False, "metalk8s_package_manager: no RPM-based system detected")


def installed(name, version=None, fromrepo=None, **kwargs):
    """Simple helper to manage package downgrade including dependencies."""
    if version is None or kwargs.get('pkgs'):
        return __states__["pkg.installed"](
            name=name, version=version, fromrepo=fromrepo, **kwargs
        )

    dep_list = __salt__['metalk8s_package_manager.list_pkg_deps'](
        name, version, fromrepo
    )
    pkgs = [{k: v} for k, v in dep_list.items()]
    return __states__["pkg.installed"](
        name=name, pkgs=pkgs, fromrepo=fromrepo, **kwargs
    )
