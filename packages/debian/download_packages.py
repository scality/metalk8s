#!/usr/bin/env python3
# coding: utf-8

"""Script that download a list of packages, and all of their dependencies."""

import os
import sys
import subprocess
from typing import Mapping, Sequence
import urllib.parse
import urllib.request


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


def main(_: Sequence[str], env: Mapping[str, str]) -> None:
    """Download the packages specified on the command-line."""
    add_external_repositories(env['SALT_VERSION'])


if __name__ == '__main__':
    _, *PACKAGES = sys.argv
    main(PACKAGES, os.environ)
