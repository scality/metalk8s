"""Custom state for managing yum packages and dependencies"""

from __future__ import absolute_import

import logging


log = logging.getLogger(__name__)


__virtualname__ = "metalk8s_package_manager"


def __virtualname__():
    if __grains__['os_family'].lower() == 'redhat':
        return __virtualname__
    return (False, "metalk8s_package_manager: no RPM-based system detected")


def installed(name, version=None, fromrepo=None, pkgs_info=None, **kwargs):
    """Custom implementation of `pkg.installed`.

    Manage packages requiring the target package when upgrading/downgrading,
    ensuring all versions are uniform with respect to what is declared
    in `pkgs_info`.
    """
    if version is None or kwargs.get('pkgs'):
        return __states__["pkg.installed"](
            name=name, version=version, fromrepo=fromrepo, **kwargs
        )

    dep_list = __salt__['metalk8s_package_manager.list_pkg_dependents'](
        name, version, fromrepo=fromrepo, pkgs_info=pkgs_info,
    )
    if dep_list is None:
        return {
            'name': name,
            'result': False,
            'changes': {},
            'comment': (
                'Failed to update package "{}" and its dependents'.format(name)
            ),
        }

    pkgs = [{k: v} for k, v in dep_list.items()]
    return __states__["pkg.installed"](
        name=name, pkgs=pkgs, fromrepo=fromrepo, **kwargs
    )
