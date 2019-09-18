#!/usr/bin/env python2
# coding: utf-8

import errno
import logging
import os
import shutil
import sys

import yum

LOGGER = logging.getLogger('download-packages')


# Helpers {{{

def setup_logging(debug_mode):
    # type: (bool) -> None
    """Setup a logger on stderr with ISO 8601 date time."""
    log_level = logging.DEBUG if debug_mode else logging.INFO
    LOGGER.setLevel(log_level)
    handler = logging.StreamHandler()
    handler.setLevel(log_level)
    formatter = logging.Formatter(
        # 8 is the length of the longest levelname.
        fmt='%(name)s - %(asctime)s - %(levelname)-8s - %(message)s',
        datefmt='%Y-%m-%dT%H:%M:%S%z'
    )
    handler.setFormatter(formatter)
    LOGGER.addHandler(handler)


def get_package(sack, package_name):
    # type: (yum.packageSack.MetaSack, str) -> yum.packages.YumAvailablePackage
    """Return the specified package."""
    name, _, ver_rel = package_name.partition('=')
    if ver_rel:
        if '-' in ver_rel:
            version, release = ver_rel.split('-')
        else:
            version, release = ver_rel, None
        package = sack.searchNevra(name=name, ver=version, rel=release)
    else:
        package = sack.returnNewestByName(name=name)
    assert len(package) == 1
    return package[0]


# }}}

def get_package_deps(
    sack,              # type: yum.packageSack.MetaSack
    root_package_name  # type: str
):
    # type: (...) -> Dict[str, yum.packages.YumAvailablePackage]
    """Return the given package and all of its dependencies.

    This function works recursively, traversing the whole dependency tree
    starting from `root_package`.
    """
    LOGGER.info('computing dependencies for %s', root_package_name)
    dependencies = {}
    stack = [get_package(sack, root_package_name)]
    while stack:
        package = stack.pop()
        LOGGER.debug('processing package %s', package.ui_nevra)
        # Skip already added dependency.
        if package.ui_nevra in dependencies:
            LOGGER.debug('package %s already processed: skip', package.ui_nevra)
            continue
        dependencies[package.ui_nevra] = package
        for requisite in package.requires:
            LOGGER.debug(
                'package %s depends on %s', package.ui_nevra, requisite
            )
            candidates = sorted(sack.getProvides(*requisite).keys())
            if not candidates:  # Can happen because we exclude some arch.
                continue
            # Take the most recent package that satisfy the dependency.
            stack.append(candidates[-1])
            LOGGER.debug(
                'select package %s (candidates: %s)', candidates[-1], candidates
            )
    return dependencies


def download_package(package):
    # type: (yum.packages.YumAvailablePackage) -> str
    """Download the RPM corresponding to `package`."""
    LOGGER.info('Downloading package %s', package.ui_nevra)
    pkg_path = package.repo.getPackage(package)
    # Copy the package into the expected location.
    filepath = os.path.join(
        '/repositories',
        'metalk8s-{}-el7'.format(package.ui_from_repo),
        os.path.basename(pkg_path)
    )
    shutil.move(pkg_path, filepath)
    return filepath


def main(packages, env):
    # type: (Sequence[str], Mapping[str, str]) -> None
    """Download the packages specified on the command-line."""
    setup_logging(env.get('ENABLE_DEBUG', False))
    yb = yum.YumBase()
    yb.setCacheDir()
    # Yeah, this looks weird but here is the doc:
    #     exclude incompatible arches. archlist is a list of compatible arches
    # So yes, here I'm excluding non-x86_64 stuff…
    yb.pkgSack.excludeArchs(archlist=['x86_64', 'noarch'])
    to_download = {}
    for package in packages:
        deps = get_package_deps(yb.pkgSack, package)
        to_download.update(deps)
    for pkg in to_download.values():
        filepath = download_package(pkg)
        os.chown(filepath, int(env['TARGET_UID']), int(env['TARGET_GID']))


if __name__ == '__main__':
    main(sys.argv[1:], os.environ)
