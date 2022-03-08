# -*- coding: utf-8 -*-
"""
Execution module for handling MetalK8s checks.
"""

import ipaddress
import os
import re

from salt.exceptions import CheckError, CommandExecutionError

__virtualname__ = "metalk8s_checks"


def __virtual__():
    return __virtualname__


def node(raises=True, **kwargs):
    """Check if the current Salt-minion match some requirements so that it can
    be used as a MetalK8s node.

    Arguments:
        raises (bool): the method will raise if there is any problem.

    Optional arguments:
        service_cidr (str): the network CIDR for Service Cluster IPs (for
            which to check the presence of a route) - if not given nor set in
            `pillar.networks.service`, this check will be skipped.
    """
    errors = []

    # Run `packages` check
    pkg_ret = __salt__["metalk8s_checks.packages"](raises=False, **kwargs)
    if pkg_ret is not True:
        errors.append(pkg_ret)

    # Run `services` check
    svc_ret = __salt__["metalk8s_checks.services"](raises=False, **kwargs)
    if svc_ret is not True:
        errors.append(svc_ret)

    # Run `ports` check
    ports_ret = __salt__["metalk8s_checks.ports"](raises=False, **kwargs)
    if ports_ret is not True:
        errors.append(ports_ret)

    # Run `containerd filesystem` checks
    fs_checks = __salt__["metalk8s_checks.containerd_filesystem"](
        raises=False, **kwargs
    )
    if fs_checks is not True:
        errors.append(fs_checks)

    # Run `route_exists` check for the Service Cluster IPs
    service_cidr = kwargs.pop(
        "service_cidr", __pillar__.get("networks", {}).get("service", None)
    )
    if service_cidr is not None:
        service_route_ret = route_exists(destination=service_cidr, raises=False)
        if service_route_ret is not True:
            errors.append(
                (
                    "Invalid networks:service CIDR - {}. Please make sure to "
                    "have either a default route or a dummy interface and route "
                    "for this range (for details, see "
                    "https://github.com/kubernetes/kubernetes/issues/57534#issuecomment-527653412)."
                ).format(service_route_ret)
            )

    # Compute return of the function
    if errors:
        error_msg = "Node {}: {}".format(__grains__["id"], "\n".join(errors))
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
        conflicting_packages = __salt__["metalk8s.get_from_map"](
            "repo", saltenv=kwargs.get("saltenv")
        )["conflicting_packages"]

    if isinstance(conflicting_packages, str):
        conflicting_packages = {conflicting_packages: None}
    elif isinstance(conflicting_packages, list):
        conflicting_packages = {package: None for package in conflicting_packages}
    errors = []

    installed_packages = __salt__["pkg.list_pkgs"](attr="version")
    for package, version in conflicting_packages.items():
        if isinstance(version, str):
            version = [version]
        if package in installed_packages:
            conflicting_versions = set(
                pkg_info["version"] for pkg_info in installed_packages[package]
            )
            if version:
                conflicting_versions.intersection_update(version)

            if conflicting_versions:
                for ver in sorted(conflicting_versions):
                    errors.append(
                        "Package {}-{} conflicts with MetalK8s installation, "
                        "please remove it.".format(package, ver)
                    )

    error_msg = "\n".join(errors)
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
        conflicting_services = __salt__["metalk8s.get_from_map"](
            "defaults", saltenv=kwargs.get("saltenv")
        )["conflicting_services"]

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
        if __salt__["service.status"](service_name) or not __salt__["service.disabled"](
            service_name
        ):
            errors.append(
                "Service {} conflicts with MetalK8s installation, "
                "please stop and disable it.".format(service_name)
            )

    error_msg = "\n".join(errors)
    if error_msg and raises:
        raise CheckError(error_msg)

    return error_msg or True


def ports(
    listening_process=None,
    raises=True,
    listening_process_per_role=None,
    roles=None,
    **kwargs,
):
    """Check if an unexpected process already listening on a port on the machine,
    return a string (or raise if `raises` is set to `True`) with the list of
    unexpected process and port.

    Arguments:
        listening_process (dict): override the list of ports expected to be
            unused (or bound to a MetalK8s process).
        raises (bool): the method will raise if there is any unexpected process
            bound on a MetalK8s port.
        listening_process_per_role (dict): If `listening_process` not provided
            compute it from this dict. Dict matching between listening process
            and roles (default: retrieve using map.jinja)
        roles (list): List of local role for the node (default: retrieve from
            pillar)

    Note: `listening_process` is a dict like
    ```
    {
        '<address>': {
            'expected': '<processes>',
            'description': '<description>',
            'mandatory': True/False
        }
    }
    ```
    Where:
    - `<address>` could be a full address `<ip>:<port>` or just a `<port>`
      (if `<ip>` is equal to `control_plane_ip` or `workload_plane_ip` we replace
      it with the local expected IP
    - `<processes>` could be a single process regexp matching or a list of regexp
      (if one of the processes in this list match then result is ok)
    - `<description>` is optional, and is just a description of the expected usage
      of this address
    - `<mandatory>` is a boolean to force this expected process, if set to False
      we expected either, the process in `expected` either nothing (default: False)
    """
    if listening_process is None:
        if listening_process_per_role is None:
            listening_process_per_role = __salt__["metalk8s.get_from_map"](
                "networks", saltenv=kwargs.get("saltenv")
            )["listening_process_per_role"]
        if roles is None:
            roles = (
                __pillar__.get("metalk8s", {})
                .get("nodes", {})
                .get(__grains__["id"], {})
                .get("roles")
            )

        # If role not yet set consider we have all roles
        if roles is None:
            roles = listening_process_per_role.keys()

        # Compute full dict of listening process according to local `roles`
        # Note: We consider all minions as "node"
        listening_process = listening_process_per_role.get("node") or {}
        for role in roles:
            listening_process.update(listening_process_per_role.get(role) or {})

    if not isinstance(listening_process, dict):
        raise ValueError(
            "Invalid listening process, expected dict but got {}.".format(
                type(listening_process).__name__
            )
        )

    errors = []

    all_listen_connections = __salt__["metalk8s_network.get_listening_processes"]()

    for address, matching in listening_process.items():
        if isinstance(address, int):
            address = str(address)
        ip, _, port = address.rpartition(":")

        if ip and ip in ["control_plane_ip", "workload_plane_ip"]:
            ip = __grains__["metalk8s"][ip]

            # We also update the `address` for error message
            address = "{}:{}".format(ip, port)

        processes = matching.get("expected")
        if not isinstance(processes, list):
            processes = [processes]

        # If process is not mandatory then we expect the process to be listening
        # or nothing, so add `None` to the processes list
        if not matching.get("mandatory") and None not in processes:
            processes.append(None)

        process_on_port = all_listen_connections.get(port)

        success = False
        error_process = {}
        # In this loop we check for a matching process in this `processes` list
        # if running process match one of the process in the `processes` list then
        # we succeed, otherwise we get an error
        # `None` mean we expect nothing listening
        for process in processes:
            match = True

            # We expect nothing to be listening on this port
            if process is None:
                if process_on_port:
                    # Failure:
                    # - we expect nothing listening on this port
                    # - a process listen on every IPs
                    # - something already listening on the expected IP
                    # NOTE: Normaly if a process listen on `0.0.0.0` we do not
                    # have any other process on this port
                    if not ip:
                        error_process = process_on_port
                        match = False
                    if "0.0.0.0" in process_on_port:
                        error_process["0.0.0.0"] = process_on_port["0.0.0.0"]
                        match = False
                    if ip in process_on_port:
                        error_process[ip] = process_on_port[ip]
                        match = False

            # We expect "<process>" to be listening on this port
            # NOTE: if nothing listening it's a failure
            else:
                # Failure:
                # - nothing listening on this ip:port
                # - nothing listening on the expected IP
                # - something not expected already listening
                if (
                    not process_on_port
                    or ip
                    and "0.0.0.0" not in process_on_port
                    and ip not in process_on_port
                ):
                    match = False
                elif "0.0.0.0" in process_on_port and not re.match(
                    process, process_on_port["0.0.0.0"]["name"]
                ):
                    error_process["0.0.0.0"] = process_on_port["0.0.0.0"]
                    match = False
                elif (
                    ip
                    and ip in process_on_port
                    and not re.match(process, process_on_port[ip]["name"])
                ):
                    error_process[ip] = process_on_port[ip]
                    match = False
                elif not ip:
                    for proc_ip, proc in process_on_port.items():
                        if not re.match(process, proc["name"]):
                            error_process[proc_ip] = proc
                            match = False

            # This "process" match what we expect
            if match:
                success = True
                break

        if not success:
            fail_msg = "{} should be listening on {} but {}.".format(
                matching.get(
                    "description",
                    " or ".join(process or "nothing" for process in processes),
                ),
                address,
                "nothing listening"
                if not error_process
                else " and ".join(
                    "'{proc[name]}' (PID: {proc[pid]}) listens on {addr}".format(
                        proc=proc, addr=addr
                    )
                    for addr, proc in error_process.items()
                ),
            )

            errors.append(fail_msg)

    error_msg = "\n".join(errors)
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


def route_exists(destination, raises=True):
    """Check if a route exists for the destination (IP or CIDR).

    NOTE: only supports IPv4 routes.

    Arguments:
        destination (string): the destination IP or CIDR to check.
        raises (bool): the method will raise if there is no route for this
            destination.
    """
    dest_net = ipaddress.IPv4Network(destination)
    error = None
    route_exists = False

    all_routes = __salt__["metalk8s_network.routes"]()

    for route in all_routes:
        # Check if our destination network is fully included in this route.
        route_net = ipaddress.IPv4Network(
            "{r[destination]}/{r[netmask]}".format(r=route)
        )
        if _is_subnet_of(dest_net, route_net):
            break
        else:
            route_exists |= dest_net.network_address in route_net
    else:
        if route_exists:
            error = (
                "A route was found for {n.network_address}, but it does not "
                "match the full destination network {n.compressed}"
            ).format(n=dest_net)
        else:
            error = "No route exists for {}".format(dest_net.compressed)

    if error and raises:
        raise CheckError(error)

    return error or True


def containerd_filesystem(raises=True, **_kwargs):
    error = None
    folder = "/var/lib/containerd"
    while not os.path.exists(folder):
        folder = os.path.dirname(folder)
    res = __salt__["cmd.run_all"](f"df --output=source,fstype {folder}")
    if res["retcode"] != 0:
        error = f"Cannot check filesystem of {folder}, ({res['stderr']})"
    else:
        device = res["stdout"].split()[2]
        fstype = res["stdout"].split()[3]
        # We use the exact output to prevent false positives
        if fstype != "xfs":
            # Not an XFS filesystem, no need to check
            return True
        try:
            infos = __salt__["xfs.info"](device)
            ftype = infos["naming"]["ftype"]
            if ftype != "1":
                error = (
                    f"Containerd XFS filesystem ({folder}) has ftype={ftype} expected 1"
                )
        except CommandExecutionError as ex:
            error = f"Error checking ftype value from {folder}, ({ex})"
    if error and raises:
        raise CheckError(error)
    return error or True


# Helpers {{{
def _is_subnet_of(left, right):
    """Implementation of `subnet_of` method in Python 3.7+ for networks.

    Naively assumes both arguments are `ipaddress.IPNetwork` objects of the
    same IP version.
    """
    return (
        right.network_address <= left.network_address
        and right.broadcast_address >= left.broadcast_address
    )


# }}}
