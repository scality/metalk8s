# -*- coding: utf-8 -*-
'''
Module for handling MetalK8s specific calls.
'''
import logging
import os.path
import re
import six
import socket
import time

from salt.pillar import get_pillar
from salt.exceptions import CommandExecutionError
import salt.utils.args
import salt.utils.files

log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s'


def __virtual__():
    return __virtualname__


def wait_apiserver(retry=10, interval=1, **kwargs):
    """Wait for kube-apiserver to respond.

    Simple "retry" wrapper around the kubernetes.ping Salt execution function.
    """
    status = __salt__['metalk8s_kubernetes.ping'](**kwargs)
    attempts = 1

    while not status and attempts < retry:
        time.sleep(interval)
        status = __salt__['metalk8s_kubernetes.ping'](**kwargs)
        attempts += 1

    if not status:
        log.error('Kubernetes apiserver failed to respond after %d attempts',
                  retry)

    return status


def format_san(names):
    '''Format a `subjectAlternativeName` section of a certificate.

    Arguments:
        names ([str]): List if SANs, either IP addresses or DNS names
    '''
    def format_name(name):
        # First, try to parse as an IPv4/IPv6 address
        for af_name in ['AF_INET', 'AF_INET6']:
            try:
                af = getattr(socket, af_name)
            except AttributeError:  # pragma: no cover
                log.info('Unkown address family: %s', af_name)
                continue

            try:
                # Parse
                log.debug('Trying to parse %r as %s', name, af_name)
                packed = socket.inet_pton(af, name)
                # Unparse
                log.debug('Trying to unparse %r as %s', packed, af_name)
                unpacked = socket.inet_ntop(af, packed)

                result = 'IP:{}'.format(unpacked)
                log.debug('SAN field for %r is "%s"', name, result)
                return result
            except socket.error as exc:
                log.debug('Failed to parse %r as %s: %s', name, af_name, exc)

        # Fallback to assume it's a DNS name
        result = 'DNS:{}'.format(name)
        log.debug('SAN field for %r is "%s"', name, result)
        return result

    return ', '.join(sorted(format_name(name) for name in names))


def minions_by_role(role, nodes=None):
    '''Return a list of minion IDs in a specific role from Pillar data.

    Arguments:
        role (str): Role to match on
        nodes (dict(str, dict)): Nodes to inspect
            Defaults to `pillar.metalk8s.nodes`.
    '''
    if nodes is None:
        try:
            nodes = __pillar__['metalk8s']['nodes']
        except Exception as exc:
            raise CommandExecutionError(
                "Can't retrieve 'metalk8s:nodes' pillar: {}".format(exc)
            )

    pillar_errors = nodes.pop('_errors', None)
    if pillar_errors:
        raise CommandExecutionError(
            "Can't retrieve minions by role because of errors in pillar "
            "'metalk8s:nodes': {}".format(', '.join(pillar_errors))
        )

    return [
        node
        for (node, node_info) in nodes.items()
        if role in node_info.get('roles', [])
    ]


def _get_archive_version(info):
    """Extract archive version from info

    Arguments:
        info (str): content of metalk8s product.txt file
    """
    match = re.search(r'^VERSION=(?P<version>.+)$', info, re.MULTILINE)
    return match.group('version') if match else None


def _get_archive_name(info):
    """Extract archive name from info

    Arguments:
        info (str): content of metalk8s product.txt file
    """
    match = re.search(r'^NAME=(?P<name>.+)$', info, re.MULTILINE)
    return match.group('name') if match else None


def _get_archive_info(info):
    """Extract archive information from info

    Arguments:
        info (str): content of metalk8s product.txt file
    """
    return {
        'version': _get_archive_version(info),
        'name': _get_archive_name(info)
    }


def archive_info_from_tree(path):
    """Extract archive information from a directory

    Arguments:
        path (str): path to a directory
    """
    log.debug('Reading archive version from %r', path)

    product_txt = os.path.join(path, 'product.txt')

    if not os.path.isfile(product_txt):
        raise CommandExecutionError(
            'Path {} has no "product.txt"'.format(path))

    with salt.utils.files.fopen(product_txt) as fd:
        return _get_archive_info(fd.read())


def archive_info_from_iso(path):
    """Extract archive information from an iso

    Arguments:
        path (str): path to an iso
    """
    log.debug('Reading archive version from %r', path)

    cmd = ' '.join([
        'isoinfo',
        '-x', '/PRODUCT.TXT\;1',
        '-i', '"{}"'.format(path),
    ])
    result = __salt__['cmd.run_all'](cmd=cmd)
    log.debug('Result: %r', result)

    if result['retcode'] != 0:
        raise CommandExecutionError(
            'Failed to run isoinfo: {}'.format(
                result.get('stderr', result['stdout'])
            )
        )

    return _get_archive_info(result['stdout'])


def get_archives(archives=None):
    """Get a matching between version and path from archives or
    `metalk8s.archives` from pillar if archives is None

    Arguments:
        archives (list): list of path to directory or iso
    """
    if not archives:
        archives = __pillar__.get('metalk8s', {}).get('archives', [])

    if isinstance(archives, six.string_types):
        archives = [str(archives)]
    elif not isinstance(archives, list):
        raise CommandExecutionError(
            'Invalid archives: list or string expected, got {0}'.format(
                archives
            )
        )

    res = {}
    for archive in archives:
        if os.path.isdir(archive):
            iso = None
            info = archive_info_from_tree(archive)
            path = archive
            version = info['version']
        elif os.path.isfile(archive):
            iso = archive
            info = archive_info_from_iso(archive)
            version = info['version']
            path = '/srv/scality/metalk8s-{0}'.format(version)
        else:
            log.warning(
                'Skip, invalid archive path %s, should be an iso or a '
                'directory.',
                archive
            )
            continue

        info.update({'path': path, 'iso': iso})
        env_name = 'metalk8s-{0}'.format(version)

        # Warn if we have 2 archives with the same version
        if env_name in res:
            archive = res[env_name]
            log.warning(
                'Archives have the same version: %s is overridden by %s.',
                archive, info
            )

        res.update({env_name: info})
    return res


def check_pillar_keys(keys, refresh=True, pillar=None, raise_error=True):
    """Check that some pillar keys are available and not empty, `None`, 0

    Arguments:
        keys (list): list of keys to check
        refresh (bool): refresh pillar or not
        pillar (dict): pillar dict to check
    """
    # Ignore `refresh` if pillar is provided
    if not pillar and refresh:
        # Do not use `saltutil.refresh_pillar` as in salt 2018.3 we can not do
        # synchronous pillar refresh
        # See https://github.com/saltstack/salt/issues/20590
        pillar = get_pillar(
            __opts__,
            __grains__,
            __grains__['id'],
            saltenv=__opts__.get('saltenv'),
            pillarenv=__opts__.get('pillarenv')
        ).compile_pillar()

    if not pillar:
        pillar = __pillar__

    if not isinstance(keys, list):
        keys = [keys]

    errors = []

    for key_list in keys:
        value = pillar
        if not isinstance(key_list, list):
            key_list = key_list.split('.')

        for key in key_list:
            error = value.get('_errors')
            value = value.get(key)
            if not value:
                if not error:
                    error = ["Empty value for {}".format(key)]

                errors.append(
                    'Unable to get {}:\n\t{}'.format(
                        '.'.join(key_list),
                        '\n\t'.join(error)
                    )
                )
                break

    if errors:
        if raise_error:
            raise CommandExecutionError('\n'.join(errors))
        else:
            log.error('\n'.join(errors))
            return False

    return True


def format_slots(data):
    """Helper to replace slots in nested dictionnary

    "__slots__:salt:module.function(arg1, arg2, kwarg1=abc, kwargs2=cde)

    Arguments:
        data: Data structure to format
    """
    slots_callers = {
        "salt": __salt__
    }

    if isinstance(data, list):
        return [format_slots(elt) for elt in data]

    if isinstance(data, dict):
        return {key: format_slots(value) for key, value in data.items()}

    if isinstance(data, six.string_types) and data.startswith('__slot__:'):
        fmt = data.split(":", 2)
        if len(fmt) != 3:
            log.warning(
                "Malformed slot %s: expecting "
                "'__slot__:<caller>:<module>.<function>(...)'",
                data
            )
            return data
        if fmt[1] not in slots_callers:
            log.warning(
                "Malformed slot '%s': invalid caller, must use one of '%s'",
                data, "', '".join(slots_callers.keys())
            )
            return data

        fun, args, kwargs = salt.utils.args.parse_function(fmt[2])

        try:
            return slots_callers[fmt[1]][fun](*args, **kwargs)
        except Exception as exc:
            raise CommandExecutionError(
                "Unable to compute slot '{}': {}".format(data, exc)
            )

    return data
