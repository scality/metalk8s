# coding: utf-8
"""Utility module for volume management."""

import collections
import contextlib
import ctypes
import ctypes.util
import functools


__virtualname__ = 'metalk8s_volumes'


def __virtual__():
    return __virtualname__


# libblkid wrapper {{{

# Why this module instead of shelling out to `blkid`?
# ===================================================
#
# Because we want to be as sure as possible that when `blkid` returns no
# informationg is means "there is no info" and not "maybe there is some info but
# I couldn't get them" (because if we mix two cases, we may actually format
# something because we thought "ho there is nothing, davai" whereas the reality
# is "there was data but I haven't seen them because reasons…").
#
# Relying on `return code 2 == no data` seems kinda safe, but it's not 100%
# clear from the man page. Now we could check the source code (and I did) but
# that would only be valid for the current version we look at.
#
# So let's directly attack the library, making sure that any API call will
# result in an exception and thus if we end up with "no data" then that truly
# means "everything went well, but there was nothing there".

# Low level wrapper {{{

soname = ctypes.util.find_library('blkid')
if soname is None:
    raise ImportError('cannot find blkid library')
blkid = ctypes.cdll.LoadLibrary(soname)

# See `/usr/include/blkid/blkid.h` & co for more details.

# Error handlers {{{


class BlkidError(Exception):
    """Error from the blkid library."""
    def __init__(self, funcname, arguments):
        message = 'function call {}({}) failed'.format(
            funcname, ', '.join(arguments)
        )
        super(BlkidError, self).__init__(message)


def _check_null_pointer(result, func, arguments):
    """Check for functions returning NULL to signal an error."""
    if result is None:
        raise BlkidError(func.__name__, arguments)
    return result


def _check_error_code(result, func, arguments):
    """Check for functions returning a negative integer to signal an error."""
    if result < 0:
        raise BlkidError(func.__name__, arguments)
    return result


# }}}
# Probing {{{


# blkid_probe blkid_new_probe_from_filename(const char *filename)
#
# Args:
#     filename: device or regular file
#
# Returns:
#     a pointer to the newly allocated probe struct or NULL in case of error.
new_probe_from_filename = blkid.blkid_new_probe_from_filename
new_probe_from_filename.restype  = ctypes.c_void_p
new_probe_from_filename.argtypes = [ctypes.c_char_p]
new_probe_from_filename.errcheck = _check_null_pointer

# void blkid_free_probe(blkid_probe pr)
#
# Args:
#     pr: probe
#
# Returns:
#     None
free_probe = blkid.blkid_free_probe
free_probe.restype  = None
free_probe.argtypes = [ctypes.c_void_p]

# int blkid_do_safeprobe(blkid_probe pr)
#
# Args:
#     pr: probe
#
# Returns:
#     0 on success, 1 if nothing is detected, -2 if ambivalent result is
#     detected and -1 on case of error.
do_safeprobe = blkid.blkid_do_safeprobe
do_safeprobe.restype  = ctypes.c_int
do_safeprobe.argtypes = [ctypes.c_void_p]
do_safeprobe.errcheck = _check_error_code

# int blkid_probe_numof_values(blkid_probe pr)
#
# Args:
#     pr: probe
#
# Returns:
#     number of values in probing result or -1 in case of error.
probe_numof_values = blkid.blkid_probe_numof_values
probe_numof_values.restype  = ctypes.c_int
probe_numof_values.argtypes = [ctypes.c_void_p]
probe_numof_values.errcheck = _check_error_code

# int blkid_probe_get_value(blkid_probe pr, int num, const char **name,
#                           const char **data, size_t *len)
#
# Note, the @len returns length of the @data, including the terminating '\0'
# character.
#
# Args:
#     pr:   probe
#     num:  wanted value in range 0..N, where N is blkid_probe_numof_values()-1
#     name: pointer to return value name or NULL
#     data: pointer to return value data or NULL
#     len:  pointer to return value length or NULL
#
# Returns:
#     0 on success, or -1 in case of error.
probe_get_value = blkid.blkid_probe_get_value
probe_get_value.restype  = ctypes.c_int
probe_get_value.argtypes = [
    ctypes.c_void_p,
    ctypes.c_int,
    ctypes.POINTER(ctypes.c_char_p),
    ctypes.POINTER(ctypes.c_char_p),
    ctypes.POINTER(ctypes.c_size_t)
]
probe_get_value.errcheck = _check_error_code


# }}}
# Partitions prober {{{


# int blkid_probe_enable_partitions(blkid_probe pr, int enable)
#
# Args:
#     pr: probe
#     enable: TRUE/FALSE
#
# Returns:
#     0 on success, or -1 in case of error.
probe_enable_partitions = blkid.blkid_probe_enable_partitions
probe_enable_partitions.restype  = ctypes.c_int
probe_enable_partitions.argtypes = [ctypes.c_void_p, ctypes.c_int]
probe_enable_partitions.errcheck = _check_error_code

# int blkid_probe_set_partitions_flags(blkid_probe pr, int flags)
#
# Args:
#     pr: probe
#     flags: PARTS_* flags
#
# Returns:
#     0 on success, or -1 in case of error.
probe_set_partitions_flags = blkid.blkid_probe_set_partitions_flags
probe_set_partitions_flags.restype  = ctypes.c_int
probe_set_partitions_flags.argtypes = [ctypes.c_void_p, ctypes.c_int]
probe_set_partitions_flags.errcheck = _check_error_code


# Probing flags for the partitioning prober.
PARTS_FORCE_GPT     = 1 << 1
PARTS_ENTRY_DETAILS = 1 << 2
PARTS_MAGIC         = 1 << 3


# }}}
# Superblocks prober {{{


# int blkid_probe_enable_superblocks(blkid_probe pr, int enable)
#
# Args:
#     pr: probe
#     enable: TRUE/FALSE
#
# Returns:
#     0 on success, or -1 in case of error.
probe_enable_superblocks = blkid.blkid_probe_enable_superblocks
probe_enable_superblocks.restype  = ctypes.c_int
probe_enable_superblocks.argtypes = [ctypes.c_void_p, ctypes.c_int]
probe_enable_superblocks.errcheck = _check_error_code

# int blkid_probe_set_superblocks_flags(blkid_probe pr, int flags)
#
# Args:
#     pr: probe
#     flags: SUBLKS_* flags
#
# Returns:
#     0 on success, or -1 in case of error.
probe_set_superblocks_flags = blkid.blkid_probe_set_superblocks_flags
probe_set_superblocks_flags.restype  = ctypes.c_int
probe_set_superblocks_flags.argtypes = [ctypes.c_void_p, ctypes.c_int]
probe_set_superblocks_flags.errcheck = _check_error_code


# Probing flags for the superblocks prober.
SUBLKS_LABEL    = 1 <<  1  # Read LABEL from superblock.
SUBLKS_LABELRAW = 1 <<  2  # Read and define LABEL_RAW result value.
SUBLKS_UUID     = 1 <<  3  # Read UUID from superblock.
SUBLKS_UUIDRAW  = 1 <<  4  # Read and define UUID_RAW result value.
SUBLKS_TYPE     = 1 <<  5  # Define TYPE result value.
SUBLKS_SECTYPE  = 1 <<  6  # Define compatible fs type (second type).
SUBLKS_USAGE    = 1 <<  7  # Define USAGE result value.
SUBLKS_VERSION  = 1 <<  8  # Read FS type from superblock.
SUBLKS_MAGIC    = 1 <<  9  # Define SBMAGIC and SBMAGIC_OFFSET.
SUBLKS_BADCSUM  = 1 << 10  # Allow a bad checksum.
SUBLKS_DEFAULT  = (SUBLKS_LABEL | SUBLKS_UUID | SUBLKS_TYPE | SUBLKS_SECTYPE)


# }}}
# }}}
# High level wrapper {{{


# No enum in Python 2 :-(
class SuperblockFlags(object):
    """Probing flags for the superblocks prober."""
    LABEL    = SUBLKS_LABEL
    LABELRAW = SUBLKS_LABELRAW
    UUID     = SUBLKS_UUID
    UUIDRAW  = SUBLKS_UUIDRAW
    TYPE     = SUBLKS_TYPE
    SECTYPE  = SUBLKS_SECTYPE
    USAGE    = SUBLKS_USAGE
    VERSION  = SUBLKS_VERSION
    MAGIC    = SUBLKS_MAGIC
    BADCSUM  = SUBLKS_BADCSUM
    DEFAULT  = SUBLKS_DEFAULT


class PartitionFlags(object):
    """Probing flags for the partitions prober."""
    FORCE_GPT     = PARTS_FORCE_GPT
    ENTRY_DETAILS = PARTS_ENTRY_DETAILS
    MAGIC         = PARTS_MAGIC


DeviceInfo = collections.namedtuple(
    'DeviceInfo', ['fstype', 'uuid', 'has_partition']
)

ProbeConfig = collections.namedtuple(
    'ProbeConfig',
    ['enable_superblocks', 'superblocks_flags',
     'enable_partitions',  'partitions_flags']
)


def _get_flags(klass, kind, default, *args):
    """Convert a list of flag names into a bitfield."""
    if not args:
        return default
    flags = []
    for arg in args:
        flag = getattr(klass, arg)
        if flag is None:
            raise ValueError('{} is not a valid flag for the {} prober'\
                             .format(arg, kind))
        flags.append(flag)
    return functools.reduce(lambda x, y: x | y, flags, 0)


class _Probe(object):
    def __init__(self, probe):
        self._probe = probe

    def configure(
        self,
        use_superblocks, superblocks_flags, use_partitions, partitions_flags,
    ):
        """Configure the probe."""
        if use_superblocks:
            probe_enable_superblocks(self._probe, 1)
            probe_set_superblocks_flags(self._probe, superblocks_flags)
        else:
            probe_enable_superblocks(self._probe, 0)
            probe_set_superblocks_flags(self._probe, 0)
        if use_partitions:
            probe_enable_partitions(self._probe, 1)
            probe_set_partitions_flags(self._probe, partitions_flags)
        else:
            probe_enable_partitions(self._probe, 0)
            probe_set_partitions_flags(self._probe, 0)

    def probe(self):
        """Probe a device and return the information gathered."""
        if do_safeprobe(self._probe) == 1:  # Nothing was detected.
            return DeviceInfo(fstype=None, uuid=None, has_partition=False)
        name   = ctypes.c_char_p()
        data   = ctypes.c_char_p()
        length = ctypes.c_size_t(0)
        info = {}
        for i in range(0, probe_numof_values(self._probe)):
            probe_get_value(
                self._probe, i,
                ctypes.byref(name), ctypes.byref(data), ctypes.byref(length)
            )
            # `length`: length of `data`, including the terminating NUL byte.
            info[name.value] = ctypes.string_at(data, length.value - 1)
        return DeviceInfo(fstype=info.get('TYPE'),
                          uuid=info.get('UUID'),
                          has_partition='PTTYPE' in info)


@contextlib.contextmanager
def get_blkid_probe(
    filepath,
    use_superblocks=True, superblocks_flags=SuperblockFlags.DEFAULT,
    use_partitions=False, partitions_flags=0,
):
    """Return a probe for the specified device."""
    c_probe = new_probe_from_filename(filepath.encode())
    try:
        probe = _Probe(c_probe)
        probe.configure(use_superblocks, superblocks_flags,
                        use_partitions, partitions_flags)
        yield probe
    finally:
        free_probe(c_probe)


def get_superblock_flags(*args):
    return _get_flags(
        SuperblockFlags, 'superblocks', SuperblockFlags.DEFAULT, *args
    )


def get_partition_flags(*args):
    return _get_flags(PartitionFlags, 'partitions', 0, *args)


# }}}
# }}}
