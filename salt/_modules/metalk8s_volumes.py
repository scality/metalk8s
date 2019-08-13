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


def is_provisioned(name):
    """Check if the backing storage device is provisioned for the given volume.

    Args:
        path (str): path of the sparse file

    Returns:
        bool: True if the backing storage device is provisioned, otherwise False

    CLI Example:

    .. code-block:: bash

        salt '*' metalk8s_volumes.is_provisioned example-volume
    """
    return _get_volume(name).is_provisioned


def provision(name):
    """Provision the backing storage device of the given volume.

    Args:
        name (str): volume name

    Returns:
        str: path to the associated loop device

    CLI Example:

    .. code-block:: bash

        salt '*' metalk8s_volumes.provision example-volume
    """
    return _get_volume(name).provision()


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
    def is_provisioned(self):
        """Check if the backing storage device is provisioned."""
        return

    @abc.abstractmethod
    def provision(self):
        """Provision the backing storage device."""
        return

    @abc.abstractproperty
    def path(self):
        """Path to the backing device."""
        return

    @property
    def is_formatted(self):
        """Check if the volume is already formatted."""
        fs_type = self.get('spec.storageClassName.parameters.fsType')
        return __salt__['disk.fstype'](self.path) == fs_type

    def format(self, force=False):
        """Format the volume.

        The volume is formatted according to its StorageClass.
        """
        # Check that the backing device is not already formatted.
        # Bail out if it is: we don't want data loss because of a typo…
        if __salt__['disk.fstype'](self.path):
            raise Exception('backing device `{}` already formatted'.format(
                self.path
            ))
        params = self.get('spec.storageClassName.parameters')
        # mkfs options, if any, are stored as JSON-encoded list.
        options = json.loads(params.get('mkfsOptions', '[]'))
        fs_type = params['fsType']
        command = _mkfs(
            self.path, fs_type, self.get('metadata.uid'), force, options
        )
        _run_cmd(' '.join(command))

    def get(self, path):
        """Return the Volume attribute `path` from the Volume dict."""
        return functools.reduce(operator.getitem, path.split('.'), self._volume)


# }}}
# SparseLoopDevice {{{


class SparseLoopDevice(Volume):
    @property
    def path(self):
        return '/var/lib/metalk8s/storage/sparse/{}'.format(
            self.get('metadata.uid')
        )

    @property
    def size(self):
        return _quantity_to_bytes(self.get('spec.sparseLoopDevice.size'))

    @property
    def exists(self):
        return (
            os.path.isfile(self.path) and
            os.path.getsize(self.path) == self.size
        )

    def create(self):
        # Try to create a sparse file, don't clobber existing one!
        open_flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        try:
            with _open_fd(self.path, open_flags) as fd:
                try:
                    os.ftruncate(fd, self.size)
                except Exception:
                    os.unlink(self.path)
                    raise
        except OSError as exn:
            raise Exception('cannot create sparse file at {}: {}'.format(
                self.path, exn
            ))

    @property
    def is_provisioned(self):
        # A sparse loop device is provisioned when a sparse file is associated
        # to a loop device.
        command = ' '.join(['losetup', '--associated', self.path])
        pattern = r'\({}\)'.format(re.escape(self.path))
        result  = _run_cmd(command)
        return re.search(pattern, result['stdout']) is not None

    def provision(self):
        # Recent losetup support `--nooverlap` but not the one shipped with
        # CentOS 7.
        command = ' '.join(['losetup', '--find', self.path])
        return _run_cmd(command)

    def format(self, force=False):
        # We format a "normal" file, not a block device: we need force=True.
        super(SparseLoopDevice, self).format(force=True)


# }}}
# RawBlockdevice {{{


class RawBlockDevice(Volume):
    @property
    def exists(self):
        """Does the backing storage device exists?"""
        return __salt__['file.is_blkdev'](self.path)

    def create(self):
        # Nothing to do, if it's missing we bail out.
        raise Exception('block device {} does not exists'.format(
            self.path
        ))

    @property
    def is_provisioned(self):
        return True  # Nothing to do so it's always True.

    def provision(self):
        return  # Nothing to do

    @property
    def path(self):
        return self.get('spec.rawBlockDevice.devicePath')

    def format(self, force=False):
        # We format an entire device, not just a partition: we need force=True.
        super(RawBlockDevice, self).format(force=True)


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


def _mkfs(path, fs_type, uuid, force=False, options=None):
    """Build the command line required to format `path` as specified.

    Args:
        path    (str):  path to the device to format
        fs_type (str):  filesystem to use for the formatting
        uuid    (str):  UUID for the new filesystem
        force   (bool): force the formatting it True
        options (list): a list of extra-formatting options.

    Returns:
        list: the command line to use
    """
    funcname =  '_mkfs_{}'.format(fs_type)
    try:
        return globals()[funcname](path, uuid, force, options)
    except KeyError:
        raise ValueError('unsupported filesystem: {}'.format(fs_type))


def _mkfs_ext4(path, uuid, force=False, options=None):
    command = ['mkfs.ext4']
    if force:
        command.append('-F')
    command.extend(['-U', uuid])
    command.extend(options or [])
    command.append(path)
    return command


def _mkfs_xfs(path, uuid, force=False, options=None):
    command = ['mkfs.xfs']
    if force:
        command.append('-f')
    command.extend(['-m', 'uuid={}'.format(uuid)])
    command.extend(options or [])
    command.append(path)
    return command


# }}}
