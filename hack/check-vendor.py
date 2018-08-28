#!/usr/bin/env python3

import os.path
import subprocess
import sys

import yaml

import requests

import distutils.version

RED = '\u001b[31m'
GREEN = '\u001b[32m'
RESET = '\u001b[0m'
BOLD = '\u001b[1m'

TICK = '\u2714'
CROSS = '\u2718'


def green(s):
    return '{}{}{}'.format(GREEN, s, RESET)


def red(s):
    return '{}{}{}'.format(RED, s, RESET)


def bold(s):
    return '{}{}{}'.format(BOLD, s, RESET)


def check_module_subtree(root, module):
    latest_commit = find_latest_squash(module['path'], root)
    latest_remote = find_latest_remote(
        module['source']['repository'], module['source']['ref']
    ).decode('ascii')

    return latest_commit[1] == latest_remote, latest_remote, latest_commit


def check_module(root, module):
    # sys.stdout.write('Checking module {!r}...\n'.format(module['path']))

    module_check_mapping = {
        'git-subtree': check_module_subtree,
        'url': lambda *args: (True, None, None)
    }
    try:
        rc, latest_remote, latest_commit = module_check_mapping[
            module['source']['type']
        ](root, module)
    except KeyError as exc:
        raise AssertionError('Unsupported source type: {}'.format(exc.args[0]))

    if rc:
        sys.stdout.write(
            '{} Subtree {} up to date\n'.format(
                green(TICK), bold(module['path'])))
        rc = True
    else:
        sys.stdout.write(
            '{} Subtree {} is outdated\n'
            '    Local: {}\n'
            '    Upstream: {}\n'.format(
                red(CROSS), bold(module['path']),
                bold(latest_commit[1]), bold(latest_remote)))
        rc = False

    return rc


HELM_REPO_CACHE = {}


def check_chart(root, chart):
    defaults = os.path.join(
        root, 'roles', chart['role'], 'defaults', 'main.yml')
    with open(defaults, 'r') as fd:
        doc = yaml.load(fd)

    prefix = chart['name'].replace('-', '_')
    repo = '{}/index.yaml'.format(doc['{}_repo'.format(prefix)].rstrip('/'))
    version = doc['{}_version'.format(prefix)]

    if repo in HELM_REPO_CACHE:
        repo_doc = HELM_REPO_CACHE[repo]
    else:
        resp = requests.get(repo)
        resp.raise_for_status()

        repo_doc = yaml.load(resp.content)

        assert repo_doc['apiVersion'] == 'v1'

        HELM_REPO_CACHE[repo] = repo_doc

    pkgs = repo_doc['entries'][chart['name']]
    newest_pkg = sorted(
        pkgs,
        key=lambda a: distutils.version.LooseVersion(a['version']),
        reverse=True)[0]

    rc = False

    if newest_pkg['version'] == version:
        sys.stdout.write(
            '{} Chart {} in role {} is up to date\n'.format(
                green(TICK), bold(chart['name']), bold(chart['role'])))
        rc = True
    else:
        sys.stdout.write(
            '{} Chart {} in role {} is outdated\n'
            '    Local: {}\n'
            '    Upstream: {}\n'.format(
                red(CROSS), bold(chart['name']), bold(chart['role']),
                bold(version), bold(newest_pkg['version'])))
        rc = False

    return rc


def main(root, yaml_path):
    with open(yaml_path, 'r') as fd:
        doc = yaml.load(fd)

    assert doc['version'] == '0.1'

    rc = True

    for module in doc['modules']:
        rc2 = check_module(root, module)
        rc = rc and rc2

    for chart in doc['charts']:
        rc2 = check_chart(root, chart)
        rc = rc and rc2

    return rc


def find_latest_squash(path, repo_path=None):
    # A fairly literal port of the related shell code in git-subtree

    sq = None
    main = None
    sub = None

    # git log --grep="^git-subtree-dir: %dir/*\$" \
    #         --pretty=format:'START %H%n%s%n%n%b%nEND%n' HEAD

    # Keep it simple, don't use pipes to stream output, assuming all output
    # will fit in a reasonable amount of memory / one pipe buffer.
    result = subprocess.run(
        args=[
            'git', 'log',
            '--grep=^git-subtree-dir: {}/*$'.format(path),
            '--pretty=format:START %H%n%s%n%n%b%nEND%n',
            'HEAD'
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=repo_path,
        check=True,
    )

    # while read a b junk
    for line in result.stdout.splitlines():
        a = None
        b = None

        parts = line.split(b' ', 2)
        if len(parts) >= 2:
            a = parts[0]
            b = parts[1]
        elif len(parts) == 1:
            a = parts[0]
            b = None
        else:
            raise ValueError('Unexpected line: {!r}'.format(line))

    #   case "$a" in
        if a == b'START':
            sq = b
        elif a == b'git-subtree-mainline:':
            main = b
        elif a == b'git-subtree-split:':
            # sub="$(git rev-parse "$b^0")" || die
            sub = subprocess.run(
                args=[
                    'git', 'rev-parse',
                    '{}^0'.format(b.decode('ascii')).encode('ascii'),
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=repo_path,
                check=True,
            ).stdout.strip()
        elif a == b'END':
            # if test -n "$sub"
            if sub:
                # if test -n "$main"
                if main:
                    sq = sub
                return (sq.decode('ascii'), sub.decode('ascii'))

            sq = None
            main = None
            sub = None

    raise RuntimeError('Unable to find latest squash')


def find_latest_remote(remote, ref):
    lines = subprocess.run(
        args=[
            'git', 'ls-remote',
            '--refs',
            '--exit-code',
            '--quiet',
            remote,
            ref,
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    ).stdout.rstrip(b'\n').split(b'\n')

    if len(lines) != 1:
        raise RuntimeError(
            'Unexpected `git ls-remote` output: {!r}'.format(lines))

    line = lines[0]
    return line.split(b'\t', 1)[0]


if __name__ == '__main__':
    base = os.path.abspath(os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        os.path.pardir))

    rc = main(base, os.path.join(base, 'third-party.yaml'))
    if not rc:
        sys.exit(1)
