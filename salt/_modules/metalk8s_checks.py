# -*- coding: utf-8 -*-
"""
Execution module for handling MetalK8s checks.
"""

from salt.exceptions import CheckError

__virtualname__ = 'metalk8s_checks'


def __virtual__():
    return __virtualname__


def node(raises=True, **kwargs):
    """Check if the current Salt-minion match some requirements so that it can
    be used as a MetalK8s node.

    Arguments:
        raises (bool): the method will raise if there is any problem.
    """
    errors = []

    # Run `packages` check
    pkg_ret = __salt__['metalk8s_checks.packages'](raises=False, **kwargs)
    if pkg_ret is not True:
        errors.append(pkg_ret)

    # Run `services` check
    svc_ret = __salt__['metalk8s_checks.services'](raises=False, **kwargs)
    if svc_ret is not True:
        errors.append(svc_ret)

    # Compute return of the function
    if errors:
        error_msg = 'Node {}: {}'.format(__grains__['id'], '\n'.join(errors))
        if raises:
            raise CheckError(error_msg)
        return error_msg

    return True


def packages(conflicting_packages=None, raises=True, **kwargs):
    """Check if some conflicting package are installed on the machine,
    return a string (or raise if `raises` is set to `True`) with the list of
    conflicting packages.

    Arguments:
        conflicting_packages (dict): override the list of package that conflict
            with MetalK8s installation.
        raises (bool): the method will raise if there is any conflicting
            package.

    Note: We have some logic in this function, so `conflicting_packages` could
    be:
    - a single string `<package_name>` which is the name of the conflicting
      package (it means we conflict with all versions of this package)
    - a list `[<package_name1>, <package_name2]` with all conflicting package
      names (it means we conflict with all versions of those packages)
    - a dict `{<package1_name>: <package1_versions>, <package2_name>: <package2_versions>}`
      where `package_versions` could be
      - `None` mean we conflicting with all versions of this package
      - A string for a single conflicting version of this package
      - A list of string for multiple conflicting versions of this package
    """
    if conflicting_packages is None:
        conflicting_packages = __salt__['metalk8s.get_from_map'](
            'repo', saltenv=kwargs.get('saltenv')
        )['conflicting_packages']

    if isinstance(conflicting_packages, str):
        conflicting_packages = {conflicting_packages: None}
    elif isinstance(conflicting_packages, list):
        conflicting_packages = {
            package: None
            for package in conflicting_packages
        }
    errors = []

    installed_packages = __salt__['pkg.list_pkgs'](attr="version")
    for package, version in conflicting_packages.items():
        if isinstance(version, str):
            version = [version]
        if package in installed_packages:
            conflicting_versions = set(
                pkg_info['version']
                for pkg_info in installed_packages[package]
            )
            if version:
                conflicting_versions.intersection_update(version)

            if conflicting_versions:
                for ver in sorted(conflicting_versions):
                    errors.append(
                        "Package {}-{} conflicts with MetalK8s installation, "
                        "please remove it.".format(package, ver)
                    )

    error_msg = '\n'.join(errors)
    if error_msg and raises:
        raise CheckError(error_msg)

    return error_msg or True


def services(conflicting_services=None, raises=True, **kwargs):
    """Check if some conflicting service are started on the machine,
    return a string (or raise if `raises` is set to `True`) with the list of
    conflicting services.

    Arguments:
        conflicting_services (list): override the list of service that conflict with
            MetalK8s installation.
        raises (bool): the method will raise if there is any conflicting service
            started.

    Note: We have some logic in this function, so `conflicting_services` could be:
    - a single string `<service_name>` which is the name of the conflicting service
    - a list `[<service_name1>, <service_name2>]` with all conflicting service name
    """
    if conflicting_services is None:
        conflicting_services = __salt__['metalk8s.get_from_map'](
            'defaults', saltenv=kwargs.get('saltenv')
        )['conflicting_services']

    if isinstance(conflicting_services, str):
        conflicting_services = [conflicting_services]
    errors = []

    for service_name in conflicting_services:
        # `service.status`:
        #   True = service started
        #   False = service not available or stopped
        # `service.disabled`:
        #   True = service disabled or not available
        #   False = service not disabled
        if __salt__['service.status'](service_name) or \
                not __salt__['service.disabled'](service_name):
            errors.append(
                "Service {} conflicts with MetalK8s installation, "
                "please stop and disable it.".format(service_name)
            )

    error_msg = '\n'.join(errors)
    if error_msg and raises:
        raise CheckError(error_msg)

    return error_msg or True


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
