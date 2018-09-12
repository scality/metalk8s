'''Validate the storage configuration with the following items

- All the drives specified in the configuration (if any)
  are existing devices

- If a drive is specified, and it is not part of the desired LVM
  VG already, it means it will be created. As a result we need to
  check if it doesn't contain a partition or a filesystem,
  otherwise the *pvcreate* command will fail

- If a drive is already a LVM PV, but not part of the desired LVM VG, raise an
  error

- If a LVM VG already exists, verify that all the drives specified
  match the one currently being owned by the VG plus possibly new ones.
  Since the lvg ansible module can reduce a VG automatically, raise an
  error, asking the operator to manually fix the storage configuration
  before proceeding

  the following situation need to be handled

  1. Initial setup with 2 disks

  .. code:: shell

    metalk8s_lvm_drives_vg_metalk8s: ['/dev/vdb', '/dev/vdc']

  2. Change the disks with removing a previous one

  .. code:: shell

    metalk8s_lvm_drives_vg_metalk8s: ['/dev/vdb', '/dev/vdd']

  3. Exit with the following error

  ::

    that "/dev/vdc" is part of the VG "vg_metalk8s" and would be removed.
    Please, either add back "/dev/vdc" to "metalk8s_lvm_drives_vg_metalk8s"
    or resolve manually the conflict and relaunch the playbooks/deploy.yml
    playbook like this

    .. code::

      ansible-playbook -i {inventory} -t storage playbooks/deploy.yml

A sample of a device dictionary as seen with ansible setup module:

  .. code::

    { "task_vars": {
        "hostvars": {
            "kube-host-0": {
                "ansible_devices" : {
                    "vdd": {
                        "holders": [],
                        "host": "",
                        "links": {
                            "ids": [
                                "virtio-b3d9454a-b0c1-432f-a"
                            ],
                            "labels": [],
                            "masters": [],
                            "uuids": []
                        },
                        "model": null,
                        "partitions": {
                            "vdd1": {
                                "holders": [],
                                "links": {
                                    "ids": [
                                        "virtio-b3d9454a-b0c1-432f-a-part1"
                                    ],
                                    "labels": [],
                                    "masters": [],
                                    "uuids": [
                                        "ba2cd4d2-a76d-4472-9559-698618c14a23"
                                    ]
                                },
                                "sectors": "20969472",
                                "sectorsize": 512,
                                "size": "10.00 GB",
                                "start": "2048",
                                "uuid": "ba2cd4d2-a76d-4472-9559-698618c14a23"
                            }
                        },
                        "removable": "0",
                        "rotational": "1",
                        "sas_address": null,
                        "sas_device_handle": null,
                        "scheduler_mode": "",
                        "sectors": "20971520",
                        "sectorsize": "512",
                        "size": "10.00 GB",
                        "support_discard": "0",
                        "vendor": "0x1af4",
                        "virtual": 1
                    }
                }
            }
        }
    }}
'''

# Note: to add mode checks/validations, simply add a top-level function whose
# name starts with `check_`. The function will receive a `task_vars` dictionary
# as defined by Ansible.
# Within a `check_*` function, use `assert` to validate values found in
# `task_vars`, or raise `AssertionError` explicitly. A single check can, of
# course, contain multiple assertions.
# Alternatively, for checks which can result in multiple errors, a check can
# return a list of (or yield) error messages.

from ansible.plugins.action import ActionBase

import inspect
import sys


def is_drive_raw_device(device, ansible_devices):
    '''Check whether a drive is a raw device or partition

    :param str device: The name of the device
        i.e: 'sdb' or 'sdb1'
    :param dict ansible_devices: The dictionary of devices gather by the
        'setup' ansible module
    :returns: A tuple with True, and the device details from ansible_devices
        if the device is a raw device. False otherwise
    :rtype: tuple
    '''

    if device in ansible_devices:
        return True, ansible_devices[device]

    return False


def is_drive_partition(device, ansible_devices, unused=False):
    '''Check whether a drive is a raw device or partition

    :param str device: The name of the device
        i.e: 'sdb' or 'sdb1'
    :param dict ansible_devices: The dictionary of devices gather by the
        'setup' ansible module
    :returns: True if the device is a raw device. False otherwise
    :rtype: bool
    :returns: A tuple with True, and the partition details from ansible_devices
        if the device is a partition. False otherwise
    :rtype: tuple
    '''

    for ansible_device, device_attr in ansible_devices.items():
        try:
            return True, device_attr['partitions'][device]
        except KeyError:
            continue  # May also pass if device_attr has no 'partitions' key

    return False, {}


def is_device_present(device, ansible_devices):
    '''
    Check that the device passed in parameters exists

    The device can be either a raw device or a partition but nothing else.

    :param str device: The name of the device
        i.e: 'sdb' or 'sdb1'
    :param dict ansible_devices: The dictionary of devices gather by the
        'setup' ansible module
    :returns: True if the device is in ansible_devices. False otherwise
    :rtype: bool
    '''

    # if the device is a raw device, check its presence
    if is_drive_partition(device, ansible_devices) \
       or is_drive_raw_device(device, ansible_devices):
        return True

    return False, {}


def is_used_by_filesystem(device, uuid):
    '''Check if the uuid properties is used for a partition

    Raises an AssertionError if a filesystem is using this device

    This is an example of a raw device dictionary

    :param str device: Name of the device being checked
    :param str uuid: UUID of the filesystem using the device
    :raises: AssertionError
    '''

    assert not uuid, (
        "The device {dev} is used by the fileystem with UUID {uuid}. "
        "Please remove it.".format(
            dev=device,
            uuid=uuid,
        )
    )


def verify_if_drive_used(device, lvm_vg, hostvars):
    '''Check if a device is used

    there is two scenarii, raw device and partition.

    In case of a raw device if it has a partition, it is considered used.

    in case of a partition the device is considered used if there is already a
    filesystem on it.help

    Also, in both scenarii, if the device is already a LVM Physical Volume,
    it is considered as used only if it's already part of
    LVM Volume Group different from the one wanted in the configuration.

    Raises an AssertionError if one of the above scenario is verified.

    :param str device: Device to check
    :param str lvm_vg: LVM Volume Group
    :param dict hostvars: Ansible hostvars variable

    :raises: AssertionError
    '''

    result, dev_attr = is_drive_raw_device(device, hostvars['ansible_devices'])
    if result:
        assert not dev_attr['partitions'], (
            "The device {dev} already have partitions. "
            "Please remove them.".format(
                dev=device,
            )
        )
        try:
            is_used_by_filesystem(device, dev_attr['links']['uuids'][0])
        except IndexError:
            pass

    result, dev_attr = is_drive_partition(device, hostvars['ansible_devices'])
    if result:
        is_used_by_filesystem(device, dev_attr['uuid'])

    try:
        # If the device is already a LVM Physical Volume
        # check its VG
        pv_device = "/dev/" + device
        if pv_device in hostvars['ansible_lvm']['pvs']:
            assert lvm_vg == hostvars['ansible_lvm']['pvs'][pv_device]['vg'], (
                "The device {dev} is already a LVM Physical Volume but is "
                "part of the LVM Volume Group {vg}. Please either remove "
                "the device from this VG or modify your configuration.".format(
                    dev=pv_device,
                    vg=hostvars['ansible_lvm']['pvs'][pv_device]['vg'],
                )
            )
    # If not found, do nothing
    except KeyError:
        pass


def get_pv_from_vg(ansible_lvm, lvm_vg):
    '''get the list of devices currently defined for a LVM Volume Group

    This function parse the ansible fact *ansible_lvm* to find the list of LVM
    Physical Volume being part of the gieven LVM Volume Group *lvm_vg*

    :param dict ansible_lvm: Dictionary from ansible fact *ansible_lvm*
    :param str lvm_vg: the name of the LVM Volume Group of which
        we want the devices
    :return: Sorted list of devices for the given LVM Volume Group
    :rype: list
    '''

    devices = [device for device in ansible_lvm['pvs'].keys()
               if ansible_lvm['pvs'][device]['vg'] == lvm_vg]
    return sorted(devices)


def is_vg_defined_with_right_device(mk8s_vg, hostvars):
    '''Check that the current existing VG has still the right devices

    :param dict hostvars: The dictionary 'hostvars' from 'setup' ansible module
        for a specific host
    :raises: AssertionError

    Raise AssertionError if the LVM Volume Group already exists and the devices
    specified in the configuration are not all already in the Volume Group
    '''

    # Check if VG is already defined first
    for lvm_vg, vg_attr in hostvars.get('metalk8s_lvm_all_vgs', {}).items():
        try:
            # if not defined, skip, it will be created later
            # Careful because key is 'lvm' here, and not 'ansible_lvm'
            # as seen when executing "setup" ansible module
            # TODO: be sure that ['ansible_lvm'] always exists
            if lvm_vg not in hostvars['ansible_lvm']['vgs']:
                continue
        # if one of the previous key is missing, we're on a fresh install
        # so we can skip too
        except KeyError:
            continue

        # the VG is already existing and we check the devices in place
        # versus the one in the configuration
        current_vg_drives = set(get_pv_from_vg(
            hostvars['ansible_lvm'], lvm_vg))
        configuration_vg_drives = set(vg_attr.get('drives', []))

        # Get the difference in the error message
        missing_drives = list(current_vg_drives.difference(
            configuration_vg_drives))
        assert current_vg_drives.issubset(configuration_vg_drives), (
            'The LVM Volume Group {vg} contains devices not present in '
            'the configuration. '
            'Please update metalk8s_lvm_{vg}_drives variable with '
            '{missing_drives} or manually fix the current '
            'LVM Physical Volume in {vg} to match this list: '
            '{wanted_drives}.'.format(
                vg=lvm_vg,
                missing_drives=missing_drives,
                wanted_drives=list(configuration_vg_drives),
            )
        )


def check_devices_presence_and_usage(hostvars):
    '''Check that the devices specified in metalk8S_lvm_drives_<vg name>
    exists on the server and are free to be used for a LVM setup

    :param dict hostvars: The dictionary 'hostvars' from 'setup' ansible module
        for a specific host
    :raises: AssertionError

    Raise AssertionError:

      * if the device is not present on the host

      * if the device stripped of '/dev' still have a '/' in it

      * if the device is a raw device and is with a partition

      * if the device has a filesystem

      * if the device is a LVM Physical Volume in the wrong LVM Volume Group
    '''

    devices_to_check = []

    for lvm_vg, vg_attr in hostvars.get('metalk8s_lvm_all_vgs', {}).items():

        # Set the variable name for the list of drives of this VG
        mk8s_vg_drives_var = 'metalk8s_lvm_drives_' + lvm_vg
        vg_found = False

        # Check if the VG already exists
        try:
            if lvm_vg in hostvars['ansible_lvm']['vgs']:
                vg_found = True
        except KeyError:
            pass

        # the VG is already existing and we check the devices in place
        # versus the one in the configuration
        if vg_attr['drives'] and vg_found:

            current_vg_drives = set(get_pv_from_vg(
                hostvars['ansible_lvm'], lvm_vg))
            configuration_vg_drives = set(vg_attr.get('drives', []))

            # if we have the same drives, continue
            if current_vg_drives == configuration_vg_drives:
                continue

            # Get the difference and keep the added devices to
            # be checked later on
            missing_drives = list(configuration_vg_drives.difference(
                current_vg_drives))
            devices_to_check.extend(missing_drives)

            # Check that we have a subset of the existing PVs in the VG
            assert current_vg_drives.issubset(configuration_vg_drives), (
                'The LVM Volume Group {vg} contains devices not present in '
                'the configuration. '
                'Please update {vg_drives_var} variable with '
                '{missing_drives} or manually fix the current '
                'LVM Physical Volume in {vg} to match this list: '
                '{wanted_drives}.'.format(
                    vg=lvm_vg,
                    vg_drives_var=mk8s_vg_drives_var,
                    missing_drives=missing_drives,
                    wanted_drives=list(configuration_vg_drives),
                )
            )

        # If we reach this point, we have 2 scenarii:
        # * creation of a new LVm VG
        # * check of devices to be added to a VG

        # If we reach this point and the list to check is empty, check all the
        # drives
        if not devices_to_check:
            devices_to_check = vg_attr['drives']

        for device in devices_to_check:

            # Strip the '/dev/' string to keep only the last part
            device_name = device.replace('/dev/', '')

            assert is_device_present(
                device_name, hostvars['ansible_devices']), \
                "The device {0} is not present".format(device)

            assert '/' not in device_name, \
                "the character \"/\" is present in the devices. " \
                "Please use the '/dev/x' form for now as it is the one " \
                "used by ansible."

            # Check that the device is free for usage
            # (see verify_if_drive_used)
            verify_if_drive_used(device_name, lvm_vg, hostvars)


class ActionModule(ActionBase):
    '''
    Check storage configuration against the current setup for MetalK8s
    '''

    def run(self, tmp=None, task_vars=None):
        if task_vars is None:
            task_vars = dict()

        result = super(ActionModule, self).run(tmp, task_vars)
        del tmp  # tmp no longer has any effect

        def collect_checks():
            for (name, obj) in inspect.getmembers(sys.modules[__name__]):
                if name.startswith('check_') and inspect.isfunction(obj):
                    yield (name, obj)

        errors = []
        failed = False

        for (name, check) in collect_checks():
            for host in task_vars.get('ansible_play_hosts', []):
                try:
                    results = check(task_vars['hostvars'][host])
                    if not results:
                        # Simple `assert`-check, passed and returned `None`
                        results = []

                    for message in results:
                        failed = True
                        errors.append('[{}]: {} [{}]'.format(
                            host, message, name))

                except AssertionError as exc:
                    failed = True
                    errors.append(
                        '[{}]: {} [{}]'.format(
                            host,
                            exc.args[0] if len(exc.args) >= 1
                            else 'Unknown failure',
                            name)
                    )

        result['failed'] = failed
        result['errors'] = errors

        return result
