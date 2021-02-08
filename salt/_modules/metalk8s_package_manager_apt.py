"""
Describes our custom way to deal with yum packages
so that we can support downgrade in metalk8s
"""
import logging

try:
    import apt

    HAS_APT_LIBS = True
except ImportError:
    HAS_APT_LIBS = False

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_package_manager"


def __virtual__():
    if __grains__["os_family"] == "Debian" and HAS_APT_LIBS:
        return __virtualname__
    return False


def _list_dependents(name, version, fromrepo=None, allowed_versions=None):
    """List and filter all packages requiring package `{name}={version}`.

    Filter based on the `allowed_versions` provided, within the provided
    `fromrepo` repositories.
    """
    log.info(
        'Listing packages depending on "%s" with version "%s"', str(name), str(version)
    )

    cache = apt.cache.Cache()
    root_package = cache[name]
    stack = [root_package]

    while stack:
        package = stack.pop()
        candidate = select_package_version(
            package, version if package is root_package else None
        )
        # Skip already added dependency.
        if candidate.sha256 in dependencies:
            continue
        dependencies[candidate.sha256] = candidate
        # `dependencies` is a list of Or-Group, let's flatten it.
        for dep in itertools.chain(*candidate.dependencies):
            # Skip virtual package (there is no corresponding DEB).
            if cache.is_virtual_package(dep.name):
                continue
            stack.append(cache[dep.name])

    return dependents


def list_pkg_dependents(
    name, version=None, fromrepo=None, pkgs_info=None, strict_version=False
):
    """
    Check dependents of the package `name`-`version` to install, to add in a
    later `pkg.installed` state along with the original package.

    Ensure all selected versions are compliant with those listed in `pkgs_info`
    if provided.

    name
        Name of the package installed

    version
        Version number of the package

    pkgs_info
        Value of pillar key `repo:packages` to consider for the requiring
        packages to update (format {"<name>": {"version": "<version>"}, ...})

    Usage :
        salt '*' metalk8s_package_manager.list_pkg_dependents kubelet 1.11.10
    """
    if pkgs_info:
        versions_dict = {
            p_name: p_info["version"] for p_name, p_info in pkgs_info.items()
        }
    else:
        versions_dict = {}

    if pkgs_info and name not in versions_dict:
        log.error(
            'Trying to list dependents for "%s", which is not referenced in '
            "the packages information provided",
            name,
        )
        return None

    all_pkgs = {name: version}

    if not version:
        return all_pkgs

    if pkgs_info and versions_dict[name] != version:
        log.error(
            'Trying to list dependents for "%s" with version "%s", '
            'while version configured is "%s"',
            name,
            version,
            versions_dict[name],
        )
        return None

    for pkg_name, desired_version in all_pkgs.items():
        if not strict_version:
            all_pkgs[pkg_name] += "*"

    return all_pkgs
