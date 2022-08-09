"""Custom state for managing yum packages and dependencies"""

from __future__ import absolute_import

import logging


log = logging.getLogger(__name__)


__virtualname__ = "metalk8s_package_manager"


def __virtual__():
    if __grains__["os_family"].lower() == "redhat":
        return __virtualname__
    return (False, "metalk8s_package_manager: no RPM system detected")


def installed(name, version=None, fromrepo=None, pkgs_info=None, **kwargs):
    """Custom implementation of `pkg.installed`.

    Manage packages requiring the target package when upgrading/downgrading,
    ensuring all versions are uniform with respect to what is declared
    in `pkgs_info`.
    """
    if version is None or kwargs.get("pkgs"):
        ret = __states__["pkg.installed"](
            name=name, version=version, fromrepo=fromrepo, **kwargs
        )
    else:
        dep_list = __salt__["metalk8s_package_manager.list_pkg_dependents"](
            name,
            version,
            fromrepo=fromrepo,
            pkgs_info=pkgs_info,
        )
        if dep_list is None:
            return {
                "name": name,
                "result": False,
                "changes": {},
                "comment": (
                    'Failed to update package "{}" and its dependents'.format(name)
                ),
            }

        pkgs = [{k: v} for k, v in dep_list.items()]
        ret = __states__["pkg.installed"](
            name=name, pkgs=pkgs, fromrepo=fromrepo, **kwargs
        )

    if (
        ret["result"]
        and not __opts__["test"]
        and __grains__["os_family"] == "RedHat"
        and __grains__["osmajorrelease"] == 8
    ):
        # With Salt on RHEL based 8 OS, even if we run a `pkg.installed` the package is not
        # marked as "installed by the user" if the package get installed earlier as
        # a dependencies
        # See: https://github.com/saltstack/salt/issues/62441
        # So, if we are in this specific case and install succeeded, we explicitly mark the
        # package as "installed by the user" using `dnf mark install`
        out = __salt__["cmd.run_all"](f'dnf mark install "{name}"')

        if out["retcode"] != 0:
            ret["result"] = False
            ret["comment"] += (
                f"\nUnable to mark {name} as installed by user:"
                f"\nSTDERR: {out['stderr']}\nSTDOUT: {out['stdout']}"
            )
        else:
            ret["comment"] += f"\nPackage {name} marked as user installed"

    return ret
