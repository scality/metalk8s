# coding: utf-8
'''Metalk8s volumes module.'''

import abc
import contextlib
import errno
import fcntl
import functools
import glob
import json
import re
import operator
import os
import six
import time

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

        salt '<NODE_NAME>' metalk8s_volumes.exists example-volume
    """
    return _get_volume(name).exists


def create(name):
    """Create the backing storage device for the given volume.

    Args:
        name (str): volume name

    CLI Example:

    .. code-block:: bash

        salt '<NODE_NAME>' metalk8s_volumes.create example-volume
    """
    _get_volume(name).create()


def is_provisioned(name):
    """Check if the backing storage device is provisioned for the given volume.

    Args:
        name (str): volume name

    Returns:
        bool: True if the backing storage device is provisioned, otherwise False

    CLI Example:

    .. code-block:: bash

        salt '<NODE_NAME>' metalk8s_volumes.is_provisioned example-volume
    """
    return _get_volume(name).is_provisioned


def provision(name):
    """Provision the backing storage device of the given volume.

    Args:
        name (str): volume name

    CLI Example:

    .. code-block:: bash

        salt '<NODE_NAME>' metalk8s_volumes.provision example-volume
    """
    _get_volume(name).provision()


def is_prepared(name):
    """Check if the given volume is prepared.

    Args:
        name (str): volume name

    Returns:
        bool: True if the volume is already prepared, otherwise False

    CLI Example:

    .. code-block:: bash

        salt '<NODE_NAME>' metalk8s_volumes.is_prepared example-volume
    """
    return _get_volume(name).is_prepared


def prepare(name):
    """Prepare the given volume.

    Args:
        name (str): volume name

    CLI Example:

    .. code-block:: bash

        salt '<NODE_NAME>' metalk8s_volumes.prepare example-volume
    """
    _get_volume(name).prepare()


def is_cleaned_up(name):
    """Check if the backing storage device for the given volume is cleaned up.

    Args:
        name (str): volume name

    Returns:
        bool: True if the backing storage device is cleaned up, otherwise False

    CLI Example:

    .. code-block:: bash

        salt '<NODE_NAME>' metalk8s_volumes.is_cleaned_up example-volume
    """
    return _get_volume(name).is_cleaned_up


def clean_up(name):
    """Clean up the backing storage device of the given volume.

    Args:
        name (str): volume name

    CLI Example:

    .. code-block:: bash

        salt '<NODE_NAME>' metalk8s_volumes.clean_up example-volume
    """
    _get_volume(name).clean_up()


def device_name(path):
    """Resolve the given device path into the "real" device name.

    For instance, `/dev/disk/by-uuid/668efc89-be5b-4b13-b3d1-1294e829f33b` could
    resolve to `sda`.

    Args:
        name (str): volume name

    CLI Example:

    .. code-block:: bash

        salt '<NODE_NAME>' metalk8s_volumes.device_name /dev/disk/by-uuid/668efc89-be5b-4b13-b3d1-1294e829f33b
    """
    # Have some retry logic, because some device manipulations may lead to
    # transient absence.
    for _ in range(10):
        # TOCTTOU, but `realpath` doesn't return error on non-existing path…
        if os.path.exists(path):
            realpath = os.path.realpath(path)
            return {'success': True, 'result': os.path.basename(realpath)}
        time.sleep(0.1)
    return {'success': False, 'result': 'device `{}` not found'.format(path)}


def device_info(name):
    """Return information about the backing storage device of the given volume.

    Returned information are:
    - a stable path (e.g.: constant across reboots) to the storage device
    - the size of the storage device (in bytes)

    Args:
        name (str): volume name

    CLI Example:

    .. code-block:: bash

        salt '<NODE_NAME>' metalk8s_volumes.device_info example-volume
    """
    try:
        volume = _get_volume(name)
    # Unlikely, but could happen if we crash/restart between the refresh from
    # the `volumes.prepared` state and the call to this module.
    except KeyError:
        __salt__['saltutil.refresh_pillar'](wait=True)
        volume = _get_volume(name)
    return volume.device_info()


# Volume {{{


@six.add_metaclass(abc.ABCMeta)
class Volume():
    """Volume interface."""

    def __init__(self, volume):
        self._volume = volume

    @abc.abstractproperty
    def exists(self):  # pragma: no cover
        """Does the backing storage device exists?"""
        return

    @abc.abstractmethod
    def create(self):  # pragma: no cover
        """Create the backing storage device."""
        return

    @abc.abstractproperty
    def is_provisioned(self):  # pragma: no cover
        """Check if the backing storage device is provisioned."""
        return

    @abc.abstractmethod
    def provision(self):  # pragma: no cover
        """Provision the backing storage device."""
        return

    @abc.abstractproperty
    def is_cleaned_up(self):  # pragma: no cover
        """Check if the backing storage device is cleaned up."""
        return

    @abc.abstractmethod
    def clean_up(self):  # pragma: no cover
        """Clean up the backing storage device."""
        return

    def device_info(self):
        """Return size and path of the underlying block device"""
        size = __salt__['disk.dump'](self.persistent_path)['getsize64']
        return {'size': size, 'path': self.persistent_path}

    @abc.abstractproperty
    def path(self):  # pragma: no cover
        """Path to the backing device."""
        return

    @property
    def uuid(self):
        return self.get('metadata.uid').lower()

    @property
    def persistent_path(self):
        """Return a persistent path to the backing device."""
        return '/dev/disk/by-uuid/{}'.format(self.uuid)

    @property
    def is_prepared(self):
        """Check if the volume is already prepared by us."""
        return _get_from_blkid(self.path).uuid == self.uuid

    def prepare(self, force=False):
        """Prepare the volume.

        The volume is formatted according to its StorageClass.
        """
        # Check that the backing device is not already formatted.
        # Bail out if it is: we don't want data loss because of a typo…
        device_info = _get_from_blkid(self.path)
        if device_info.fstype:
            raise Exception(
                'backing device `{}` already formatted'.format(self.path)
            )
        if device_info.has_partition:
            raise Exception('backing device `{}` contains a partition table'\
                            .format(self.path))
        storage_class = self.get('spec.storageClass')
        # If we got a string that means the name wasn't replaced by the object.
        if isinstance(storage_class, six.string_types):
            raise Exception('StorageClass {} not found'.format(storage_class))
        params = storage_class['parameters']
        # mkfs options, if any, are stored as JSON-encoded list.
        options = json.loads(params.get('mkfsOptions', '[]'))
        fs_type = params['fsType']
        command = _mkfs(self.path, fs_type, self.uuid, force, options)
        _run_cmd(' '.join(command))

    def get(self, path):
        """Return the Volume attribute `path` from the Volume dict."""
        return functools.reduce(operator.getitem, path.split('.'), self._volume)


# }}}
# SparseLoopDevice {{{


class SparseLoopDevice(Volume):
    # Recent losetup support `--nooverlap` but not the one shipped with
    # CentOS 7.
    PROVISIONING_COMMAND = ('losetup', '--find')

    @property
    def path(self):
        return '/var/lib/metalk8s/storage/sparse/{}'.format(self.uuid)

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
        command = ' '.join(list(self.PROVISIONING_COMMAND) + [self.path])
        return _run_cmd(command)

    def prepare(self, force=False):
        # We format a "normal" file, not a block device: we need force=True.
        super(SparseLoopDevice, self).prepare(force=True)

    @property
    def is_cleaned_up(self):
        return not (self.is_provisioned or self.exists)

    def clean_up(self):
        LOOP_CLR_FD = 0x4C01  # From /usr/include/linux/loop.h
        try:
            with _open_fd(self.persistent_path, os.O_RDONLY) as fd:
                fcntl.ioctl(fd, LOOP_CLR_FD, 0)
            os.remove(self.path)
        except OSError as exn:
            if exn.errno != errno.ENOENT:
                raise
            log.warning('{} already removed'.format(exn.filename))


class SparseLoopDeviceBlock(SparseLoopDevice):
    # Recent losetup support `--nooverlap` but not the one shipped with
    # CentOS 7.
    PROVISIONING_COMMAND = ('losetup', '--find', '--partscan')

    @property
    def persistent_path(self):
        return '/dev/disk/by-partuuid/{}'.format(self.uuid)

    @property
    def is_prepared(self):
        """Check if the volume is already prepared."""
        # Partition 1 should be identified with the volume UUID.
        device = os.path.basename(self.path) + '1'
        try:
            return _device_name(self.persistent_path) == device
        # Expected exception if the symlink doesn't exist.
        except CommandExecutionError:
            return False

    def prepare(self, force=False):
        prepare_block(self.path, self.get('metadata.name'), self.uuid)


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

    def prepare(self, force=False):
        # We format an entire device, not just a partition: we need force=True.
        super(RawBlockDevice, self).prepare(force=True)

    @property
    def is_cleaned_up(self):
        return True # Nothing to do so it's always True.

    def clean_up(self):
        return  # Nothing to do

class RawBlockDeviceBlock(RawBlockDevice):
    def __init__(self, volume):
        super(RawBlockDeviceBlock, self).__init__(volume)
        # Detect which kind of device we have: a real disk, only a partition or
        # an LVM volume.
        self._partition = self._get_partition(_device_name(self.path))
        if self._get_lvm_path() is not None:
            self._kind = DeviceType.LVM
        elif self._partition is not None:
            self._kind = DeviceType.PARTITION
        else:
            self._kind = DeviceType.DISK

    @property
    def persistent_path(self):
        if self._kind == DeviceType.LVM:
            return self._get_lvm_path()
        return '/dev/disk/by-partuuid/{}'.format(self.uuid)

    @property
    def device_path(self):
        path = self.path
        if self._kind == DeviceType.PARTITION:
            path = path.rstrip(self._partition)
        return path

    @property
    def is_prepared(self):
        # Nothing to do in LVM case (we use LVM UUID).
        if self._kind == DeviceType.LVM:
            return True
        device = os.path.basename(self.path)
        if self._kind == DeviceType.DISK:
            device += '1' # In DISK case we always have a single partition.
        try:
            return _device_name(self.persistent_path) == device
        # Expected exception if the symlink doesn't exist.
        except CommandExecutionError:
            return False

    def prepare(self, force=False):
        # Nothing to do in LVM case.
        if self._kind == DeviceType.LVM:
            return
        name = self.get('metadata.name')
        # For partition, set the partition's label & UID to the volume's ones.
        if self._kind == DeviceType.PARTITION:
            _run_cmd(' '.join([
                'sgdisk',
                '--partition-guid', '{}:{}'.format(self._partition, self.uuid),
                '--change-name', '{}:{}'.format(self._partition, name),
                self.device_path,
            ]))
        # Otherwise, create a GPT table and a unique partition.
        else:
            prepare_block(self.path, name, self.uuid)

    def _get_lvm_path(self):
        """Return the persistent path for a LVM volume.

        If the backing storage device is not an LVM volume, return None.
        """
        name = _device_name(self.path)
        for symlink in glob.glob('/dev/disk/by-id/dm-uuid-LVM-*'):
            realpath = os.path.realpath(symlink)
            if os.path.basename(realpath) == name:
                return symlink
        return None

    @staticmethod
    def _get_partition(device_name):
        part_re = r'(?:(?:h|s|v|xv)d[a-z]|nvme\d+n\d+p)(?P<partition>\d+)$'
        match = re.search(part_re, device_name)
        return match.groupdict()['partition'] if match else None


class DeviceType:
    DISK      = 1
    PARTITION = 2
    LVM       = 3

# }}}
# Helpers {{{


def _get_volume(name):
    """Get a Volume object from the pillar."""
    volume = __pillar__['metalk8s']['volumes'].get(name)
    if volume is None:
        raise ValueError('volume {} not found in pillar'.format(name))
    mode = volume['spec'].get('mode', 'Filesystem')
    if 'rawBlockDevice' in volume['spec']:
        if mode == 'Filesystem':
            return RawBlockDevice(volume)
        else:
            return RawBlockDeviceBlock(volume)
    elif 'sparseLoopDevice' in volume['spec']:
        if mode == 'Filesystem':
            return SparseLoopDevice(volume)
        else:
            return SparseLoopDeviceBlock(volume)
    else:
        raise ValueError('unsupported Volume type for Volume {}'.format(name))


def _device_name(path):
    """Return the device name from the path, raise on error."""
    res = device_name(path)
    if res['success']:
        return res['result']
    raise CommandExecutionError(message=res['result'])


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


# Cannot use `disk.fstype` from Salt because you can't trust its output…
#
# Example:
# - On a unformated sparse file:
#     __salt__['disk.fstype']('/var/lib/metalk8s/storage/sparse/example')
#     returns "/dev/sda1      ext4  41152736 7765776  31273476  20% /"
#
# - On a raw (non-formatted) block device:
#     __salt__['disk.fstype']('/dev/sdb')
#     returns "devtmpfs       devtmpfs   1932084     0   1932084   0% /dev"
#
# So yeah, let's not rely on this…
def _get_from_blkid(path):
    flags = __utils__['metalk8s_volumes.get_superblock_flags']('UUID', 'TYPE')
    kwargs = {
        'use_superblocks': True, 'superblocks_flags': flags,
        'use_partitions': True,
    }
    with __utils__['metalk8s_volumes.get_blkid_probe'](path, **kwargs) as probe:
        return probe.probe()


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

def prepare_block(path, name, uuid):
    """Prepare a "Block" volume.

    We use a GPT table and a single partition to have a link between the volume
    name/uuid and the partition label/GUID.
    """
    _run_cmd(' '.join([
        'sgdisk',
        '--largest-new', '1',
        '--partition-guid', '1:{}'.format(uuid),
        '--change-name', '1:{}'.format(name),
        path,
    ]))

# }}}
