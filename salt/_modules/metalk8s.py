# -*- coding: utf-8 -*-
'''
Module for handling MetalK8s specific calls.
'''
import logging
import os.path
import re
import socket
import time

from salt.exceptions import CommandExecutionError
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


def get_etcd_endpoint():
    '''Get endpoint only if it's an etcd node.'''
    DEFAULT_ETCD_PORT = 2380
    cidr = __pillar__.get('networks', {}).get('control_plane')
    if not cidr:
        return
    if __salt__['cri.component_is_running'](name='etcd'):
        ips = __salt__['network.ip_addrs'](cidr=cidr)
        hostname = __salt__['network.get_hostname']()
        return '{host}=https://{ip}:{port}'.format(
            host=hostname, ip=ips[0], port=DEFAULT_ETCD_PORT
        )


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
            except AttributeError:
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
    nodes = nodes or __pillar__['metalk8s']['nodes']

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

    with salt.utils.files.fopen(os.path.join(path, 'product.txt')) as fd:
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

    if isinstance(archives, basestring):
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
        if env_name in archives:
            archive = res[env_name]
            log.warning(
                'Skip, archive %s has the same version as %s: %s.',
                archive, archive['iso'] or archive['path'], version
            )
        res.update({env_name: info})
    return res
