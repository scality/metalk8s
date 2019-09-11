#!/usr/bin/env python3
# coding: utf-8

"""Script that download a list of packages, and all of their dependencies."""

import itertools
import os
import pathlib
import sys
import subprocess
from typing import Dict, Mapping, Optional, Sequence
import urllib.parse
import urllib.request

# pylint: disable=import-error
import apt      # type: ignore
import apt_pkg  # type: ignore
# pylint: enable=import-error


# Helpers {{{


def apt_key_add(key_url: str) -> None:
    """Add the GPG key at `key_url` to the list of trusted keys."""
    with urllib.request.urlopen(key_url) as response:
        key = response.read()
    subprocess.run(['apt-key', 'add', '-'], input=key, check=True)


def add_source_list(name: str, url: str) -> None:
    """Add a new packages source called `name` using the give URL as source."""
    filepath = '/etc/apt/sources.list.d/{}.list'.format(name)
    with open(filepath, 'w', encoding='utf-8') as fp:
        print(url, file=fp)


def select_package_version(
    package: apt.package.Package, version: Optional[str]
) -> apt.package.Version:
    """Select one version of the given package.

    If a version is specified we return this one (ValueError is raised if the
    specified version is not available). Otherwise, we simply return the most
    recent version available.
    """
    if version is None:
        return sorted(package.versions)[-1]
    for candidate in package.versions:
        if version in candidate.version:
            return candidate
    raise ValueError('package {} not found in version {}: {}'.format(
        package.name, version, package.versions
    ))


def select_package_origin(package: apt.package.Version) -> str:
    """Select a trusted origin for the package and return its "name"."""
    for origin in package.origins:
        if not origin.trusted:
            continue
        # Some repo don't have `archive` (Salt, I'm looking at you…).
        return str(origin.archive) or str(origin.label)
    raise Exception('no trusted origin found for package {}'\
                    .format(pathlib.Path(package.filename).name))


# We can't use `package.fetch_binary` because it relies on MD5 and some packages
# only have a SHA256…
#
# In the same vein, we are doing checksum validation manually because
# `apt_pkg.AcquireFile` is failing on some packages (the ones from the external
# repositories…).
def fetch_binary(
    package: apt.package.Version, destdir: pathlib.Path
) -> pathlib.Path:
    """Download the DEB file corresponding to the given package."""
    destdir.mkdir(exist_ok=True)  # TODO: to be done by the build chain.

    filename = pathlib.Path(package.filename).name
    destfile = destdir/filename
    print('Downloading package {}'.format(filename))
    with urllib.request.urlopen(package.uri) as response:
        destfile.write_bytes(response.read())
    # Check package size.
    if destfile.stat().st_size != package.size:
        raise Exception('Failed to download package {}: size mismatch'.format(
            filename
        ))
    # Check package checksum.
    with open(destfile) as fp:
        if apt_pkg.sha256sum(fp) != package.sha256:
            raise Exception('Failed to download package {}: checksum failed'\
                            .format(filename))
    return destfile


# }}}


def add_external_repositories(salt_version: str) -> None:
    """Register Salt and Kubernetes repository."""
    # Only keep the major and minor version number.
    salt_version = '.'.join(salt_version.split('.')[:2])
    # TODO: move these static info in `versions.py`.
    repositories = [
        {
            'name': 'kubernetes',
            'key': 'https://packages.cloud.google.com/apt/doc/apt-key.gpg',
            # TODO: use `xenial` because there is no `bionic` repo…
            'source': 'deb http://apt.kubernetes.io/ kubernetes-xenial main',
        }, {
            'name': 'saltstack',
            'key': urllib.parse.urljoin(
                'https://repo.saltstack.com/',
                'apt/ubuntu/18.04/amd64/{}/SALTSTACK-GPG-KEY.pub'.format(
                    salt_version
                )
            ),
            'source': 'deb http://repo.saltstack.com/apt/ubuntu/'\
                      '18.04/amd64/{} bionic main'.format(salt_version)
        }
    ]
    for repo in repositories:
        print('Adding {} repository: '.format(repo['name']), end='', flush=True)
        apt_key_add(repo['key'])
        add_source_list(repo['name'], repo['source'])
    subprocess.check_call(['apt', 'update'])


def get_package_deps(
    root_package_name: str, cache: apt.cache.Cache
) -> Dict[str, apt.package.Version]:
    """Return the given package and all of its dependencies.

    This function works recursively, traversing the whole dependency tree
    starting from `root_package`.

    Arguments:
        root_package_name: name of the package you want to explicitly install
        cache:             packages cache

    Returns:
        A list of package versions, for the root package and its dependency
        tree.
    """
    dependencies : Dict[str, apt.package.Version] = {}

    name, _, version = root_package_name.partition('=')
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
    return dependencies


def download_package(package: apt.package.Version) -> pathlib.Path:
    """Download the DEB corresponding to `package`."""
    repo = select_package_origin(package)
    destination = pathlib.Path('/repositories', 'metalk8s-{}'.format(repo))
    return fetch_binary(package, destdir=destination)


def main(packages: Sequence[str], env: Mapping[str, str]) -> None:
    """Download the packages specified on the command-line."""
    add_external_repositories(env['SALT_VERSION'])
    apt_pkg.init()
    cache = apt.cache.Cache()
    to_download = {}
    for package in packages:
        deps = get_package_deps(package, cache)
        to_download.update(deps)
    for pkg in to_download.values():
        filepath = download_package(pkg)
        os.chown(filepath, int(env['TARGET_UID']), int(env['TARGET_GID']))


if __name__ == '__main__':
    _, *PACKAGES = sys.argv
    main(PACKAGES, os.environ)
