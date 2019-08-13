# coding: utf-8
'''Metalk8s volumes module.'''

import abc
import contextlib
import functools
import json
import re
import operator
import os

import logging

from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)


__virtualname__ = 'metalk8s_volumes'


def __virtual__():
    return __virtualname__


def exists(name):
    """Check if the backing storage device exists for the given volume.

    Args:
        name (str): volume name

    Returns:
        bool: True if the backing storage device exists, otherwise False

    CLI Example:

    .. code-block:: bash

        salt '*' metalk8s_volumes.exists example-volume
    """
    return _get_volume(name).exists


def create(name):
    """Create the backing storage device for the given volume.

    Args:
        name (str): volume name

    Returns:
        None

    CLI Example:

    .. code-block:: bash

        salt '*' metalk8s_volumes.create example-volume
    """
    return _get_volume(name).create()


def is_initialized(name):
    """Check if the backing storage device is initialized for the given volume.

    Args:
        path (str): path of the sparse file

    Returns:
        bool: True if the backing storage device is initialized, otherwise False

    CLI Example:

    .. code-block:: bash

        salt '*' metalk8s_volumes.is_initialized example-volume
    """
    return _get_volume(name).is_initialized


def initialize(name):
    """Initialize the backing storage device of the given volume.

    Args:
        name (str): volume name

    Returns:
        str: path to the associated loop device

    CLI Example:

    .. code-block:: bash

        salt '*' metalk8s_volumes.initialize example-volume
    """
    return _get_volume(name).initialize()


def is_formatted(name):
    """Check if the given volume is formatted.

    Args:
        name (str): volume name

    Returns:
        bool: True if the volume is already formatted, otherwise False

    CLI Example:

    .. code-block:: bash

        salt '*' metalk8s_volumes.volume_is_formatted example-volume
    """
    return _get_volume(name).is_formatted


def format(name):
    """Format the given volume.

    Args:
        name (str): volume name

    Returns:
        None

    CLI Example:

    .. code-block:: bash

        salt '*' metalk8s_volumes.format example-volume
    """
    _get_volume(name).format()


# Volume {{{


class Volume(object):
    """Volume interface."""

    # XXX: Will need to be updated when moving to Python 3
    __metaclass__ = abc.ABCMeta

    def __init__(self, volume):
        self._volume = volume

    @abc.abstractproperty
    def exists(self):
        """Does the backing storage device exists?"""
        return

    @abc.abstractmethod
    def create(self):
        """Create the backing storage device."""
        return

    @abc.abstractproperty
    def is_initialized(self):
        """Check if the backing storage device is initialized."""
        return

    @abc.abstractmethod
    def initialize(self):
        """Initialize the backing storage device."""
        return

    @abc.abstractproperty
    def block_device(self):
        """Path to the backing block device."""
        return

    @property
    def is_formatted(self):
        """Check if the volume is already formatted."""
        fs_type = self['spec.storageClassName.parameters.fsType']
        return __salt__['disk.fstype'](self.block_device) == fs_type

    def format(self):
        """Format the volume.

        The volume is formatted according to its StorageClass.
        """
        params = self['spec.storageClassName.parameters']
        # mkfs options, if any, are stored as JSON-encoded list.
        mkfs_options = json.loads(params.get('mkfsOptions', '[]'))
        command = ['mkfs']
        command.extend(['-t', params['fsType']])
        command.extend(['-U', self['metadata.uid']])
        command.extend(mkfs_options)
        command.append(self.block_device)
        _run_cmd(' '.join(command))

    def __getitem__(self, path):
        """Return the Volume attribute `attr` from the Volume dict."""
        return functools.reduce(operator.getitem, path.split('.'), self._volume)


# }}}
# SparseLoopDevice {{{


class SparseLoopDevice(Volume):
    @property
    def sparse_file(self):
        return '/var/lib/metalk8s/storage/sparse/{}'.format(
            self['metadata.uid']
        )

    @property
    def size(self):
        return _quantity_to_bytes(self['spec.sparseLoopDevice.size'])

    @property
    def exists(self):
        path = self.sparse_file
        return os.path.isfile(path) and os.path.getsize(path) == self.size

    def create(self):
        # Try to create a sparse file, don't clobber existing one!
        open_flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        try:
            with _open_fd(self.sparse_file, open_flags) as fd:
                try:
                    os.ftruncate(fd, self.size)
                except Exception:
                    os.unlink(self.sparse_file)
                    raise
        except OSError as exn:
            raise Exception('cannot create sparse file at {}: {}'.format(
                self.path, exn
            ))

    @property
    def is_initialized(self):
        # A sparse loop device is initialized when a sparse file is associated
        # to a loop device.
        command = ' '.join(['losetup', '--associated', self.sparse_file])
        pattern = r'\({}\)'.format(re.escape(self.sparse_file))
        result  = _run_cmd(command)
        return re.search(pattern, result['stdout']) is not None

    def initialize(self):
        # Recent losetup support `--nooverlap` but not the one shipped with
        # CentOS 7.
        command = ' '.join(
            ['losetup', '--find', '--partscan', '--show', self.sparse_file]
        )
        result  = _run_cmd(command)
        return result['stdout'].strip()

    @property
    def block_device(self):
        command = ' '.join(['losetup', '--associated', self.sparse_file])
        result  = _run_cmd(command)
        # e.g.: /dev/loop0: [2049]:184645 (/var/lib/metalk8s/storage/sparse/vol)
        block_device, _, _ = result['stdout'].partition(':')
        return block_device


# }}}
# RawBlockdevice {{{


class RawBlockDevice(Volume):
    @property
    def block_device(self):
        return self['spec.rawBlockDevice.devicePath']


# }}}
# Helpers {{{


def _get_volume(name):
    """Get a Volume object from the pillar."""
    volume = __pillar__['metalk8s']['volumes'].get(name)
    if volume is None:
        raise ValueError('volume {} not found in pillar'.format(name))
    if 'rawBlockDevice' in volume['spec']:
        return RawBlockDevice(volume)
    elif 'sparseLoopDevice' in volume['spec']:
        return SparseLoopDevice(volume)
    else:
        raise ValueError('unsupported Volume type for Volume {}'.format(name))


def _run_cmd(cmd):
    """Execute the given `cmd` command and return its result.

    Raise `CommandExecutionError` if the command failed.

    Args:
        cmd  (str): command to execute

    Returns:
        dict: the command result (stderr, stdout, retcode, …)
    """
    ret = __salt__['cmd.run_all'](cmd)
    if ret.get('retcode', 0) != 0:
        raise CommandExecutionError(
            'error while trying to run `{0}`: {1}' .format(cmd, ret['stderr'])
        )
    return ret


def _quantity_to_bytes(quantity):
    """Return a quantity with a unit converted into a number of bytes.

    Examples:
    >>> quantity_to_bytes('42Gi')
    45097156608
    >>> quantity_to_bytes('100M')
    100000000
    >>> quantity_to_bytes('1024')
    1024

    Args:
        quantity (str): a quantity, composed of a count and an optional unit

    Returns:
        int: the capacity (in bytes)
    """
    UNIT_FACTOR = {
      None:  1,
      'Ki':  2 ** 10,
      'Mi':  2 ** 20,
      'Gi':  2 ** 30,
      'Ti':  2 ** 40,
      'Pi':  2 ** 50,
      'k':  10 ** 3,
      'M':  10 ** 6,
      'G':  10 ** 9,
      'T':  10 ** 12,
      'P':  10 ** 15,
    }
    size_regex = r'^(?P<size>[1-9][0-9]*)(?P<unit>[kKMGTP]i?)?$'
    match = re.match(size_regex, quantity)
    assert match is not None, 'invalid resource.Quantity value'
    size = int(match.groupdict()['size'])
    unit = match.groupdict().get('unit')
    return size * UNIT_FACTOR[unit]


@contextlib.contextmanager
def _open_fd(*args, **kwargs):
    fd = os.open(*args, **kwargs)
    try:
        yield fd
    finally:
        os.close(fd)


# }}}
