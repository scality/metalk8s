#!/usr/bin/env python3
"""Script for cleaning up MetalK8s sparse loop volumes.

Handle discovery of the device through a Volume's UUID, and then detach the
device using the right `ioctl`.
"""

from __future__ import print_function
import argparse
import errno
import fcntl
import os
import stat
import sys


def parse_args(args=None):
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        prog="metalk8s-sparse-volume-cleanup",
        description="Cleanup MetalK8s sparse loop volumes",
    )

    parser.add_argument(
        "volume_id",
        help="UUID of the MetalK8s Volume object",
    )

    return parser.parse_args(args=args)


SPARSE_FILES_DIR = "/var/lib/metalk8s/storage/sparse"


def check_sparse_file(volume_id):
    """Check if the sparse file exists for this volume ID."""
    sparse_file_path = os.path.join(SPARSE_FILES_DIR, volume_id)
    if not os.path.isfile(sparse_file_path):
        raise Error(
            f"Sparse file {sparse_file_path} does not exist for volume '{volume_id}'",
            exit_code=errno.ENOENT,
        )


def find_device(volume_id):
    """Find the device provisioned for this volume ID.

    SparseLoopDevice volumes are either:
    - formatted, with the volume ID set in the file-system annotations
    - raw, in which case the device is partitioned and the first partition
      is labeled with the volume ID
    """
    for _get_device in [device_by_uuid, device_from_part_uuid]:
        device_path = _get_device(volume_id)
        if device_path is not None:
            break
    else:
        raise Error(
            f"Device for volume '{volume_id}' was not found",
            exit_code=errno.ENOENT,
        )

    if not is_loop_device(device_path):
        raise Error(
            f"{device_path} (found for volume '{volume_id}') is not a loop device",
            exit_code=errno.EINVAL,
        )

    return device_path


# https://github.com/torvalds/linux/blob/master/include/uapi/linux/loop.h#L110
LOOP_CLR_FD = 0x4C01


def cleanup(volume_id):
    """Clean up a sparse volume's loop device.

    This function will bail out if a corresponding loop device cannot be
    found.
    """
    device_path = find_device(volume_id)

    print(f"Detaching loop device '{device_path}' for volume '{volume_id}'")

    device_handle = os.open(device_path, os.O_RDONLY)
    try:
        fcntl.ioctl(device_handle, LOOP_CLR_FD, 0)
    except IOError as exn:
        if exn.errno != errno.ENXIO:
            raise Error(
                f"Unexpected error when trying to free device {device_path}: {exn}",
                exit_code=exn.errno,
            ) from exn
        print("Device already freed")
    finally:
        os.close(device_handle)

    print(f"Loop device for volume '{volume_id}' was successfully detached")


def main():
    """Main "routine" of this script."""
    args = parse_args()

    check_sparse_file(args.volume_id)
    cleanup(args.volume_id)


# Helpers {{{
# Error handling {{{


def die(message, exit_code=1):
    """Print a message to the standard error stream, and exit."""
    print(message, file=sys.stderr)
    sys.stderr.flush()
    sys.exit(exit_code)


class Error(Exception):
    """Base-class for errors raised by methods from this module."""

    def __init__(self, message, *args, exit_code=1):
        super().__init__(self, message, *args)
        self.message = message
        self.exit_code = exit_code


# }}}
# Loop device discovery {{{


def device_by_uuid(volume_id):
    """Find a device by file-system UUID."""
    path_by_uuid = os.path.join("/dev/disk/by-uuid", volume_id)
    if not os.path.exists(path_by_uuid):
        return None

    return os.path.realpath(path_by_uuid)


def device_from_part_uuid(volume_id):
    """Find a device from its first partition UUID."""
    path_by_partuuid = os.path.join("/dev/disk/by-partuuid", volume_id)
    if not os.path.exists(path_by_partuuid):
        return None

    partition_name = os.path.basename(os.path.realpath(path_by_partuuid))
    device_link = os.path.join("/sys/class/block", partition_name, os.pardir)
    device_name = os.path.basename(os.path.realpath(device_link))
    return os.path.join("/dev", device_name)


# }}}

# https://github.com/torvalds/linux/blob/master/Documentation/admin-guide/devices.txt#L191
LOOP_MAJOR = 7


def is_loop_device(path):
    """Check if the provided path is a real loop device."""
    device_stat = os.stat(path)
    return stat.S_ISBLK(device_stat.st_mode) and (
        os.major(device_stat.st_rdev) == LOOP_MAJOR
    )


# }}}

if __name__ == "__main__":
    try:
        main()
    except Error as exc:
        die(exc.message, exit_code=exc.exit_code)
    except Exception as exc:  # pylint: disable=broad-except
        die(f"Unhandled exception when cleaning up volume: {exc}")
