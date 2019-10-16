"""Utility methods for Solutions management.

This module contains minion-local operations, see `metalk8s_solutions_k8s.py`
for the K8s operations in the virtual `metalk8s_solutions` module.
"""
import collections
import logging

from salt.exceptions import CommandExecutionError
import yaml

log = logging.getLogger(__name__)

SOLUTIONS_CONFIG_FILE = '/etc/metalk8s/solutions.yaml'
SUPPORTED_CONFIG_VERSIONS = frozenset((
    'solutions.metalk8s.scality.com/{}'.format(version)
    for version in ['v1alpha1']
))

__virtualname__ = 'metalk8s_solutions'


def __virtual__():
    if 'metalk8s.archive_info_from_iso' not in __salt__:
        return False, "Failed to load 'metalk8s' module."
    return __virtualname__


def read_config():
    """Read the SolutionsConfiguration file and return its contents.

    Empty containers will be used for `archives` and `active` in the return
    value.

    The format should look like the following example:

    ..code-block:: yaml

      apiVersion: metalk8s.scality.com/v1alpha1
      kind: SolutionsConfiguration
      archives:
        - /path/to/solution/archive.iso
      active:
        solution-name: X.Y.Z-suffix (or 'latest')
    """
    try:
        with open(SOLUTIONS_CONFIG_FILE, 'r') as fd:
            config = yaml.safe_load(fd)
    except Exception as exc:
        msg = 'Failed to load "{}": {}'.format(SOLUTIONS_CONFIG_FILE, str(exc))
        raise CommandExecutionError(message=msg)

    if config.get('kind') != 'SolutionsConfiguration':
        raise CommandExecutionError(
            'Invalid `kind` in configuration ({}), '
            'must be "SolutionsConfiguration"'.format(config.get('kind'))
        )

    if config.get('apiVersion') not in SUPPORTED_CONFIG_VERSIONS:
        raise CommandExecutionError(
            'Invalid `apiVersion` in configuration ({}), '
            'must be one of: {}'.format(
                config.get('apiVersion'),
                ', '.join(SUPPORTED_CONFIG_VERSIONS)
            )
        )

    config.setdefault('archives', [])
    config.setdefault('active', {})

    return config


def _is_solution_mount(mount_tuple):
    """Return whether a mount is for a Solution archive.

    Any ISO9660 mounted in `/srv/scality` that isn't for MetalK8s is considered
    to be a Solution archive.
    """
    mountpoint, mount_info = mount_tuple

    if not mountpoint.startswith('/srv/scality/'):
        return False

    if mountpoint.startswith('/srv/scality/metalk8s-'):
        return False

    if mount_info['fstype'] != 'iso9660':
        return False

    return True


def list_available():
    """Get a view of mounted Solution archives.

    Result is in the shape of a dict, with Solution names as keys, and lists
    of mounted archives (each being a dict of various info) as values.
    """
    result = collections.defaultdict(list)

    active_mounts = __salt__['mount.active']()

    solution_mounts = filter(_is_solution_mount, active_mounts.items())

    for mountpoint, mount_info in solution_mounts:
        archive = mount_info['alt_device']
        solution_info = __salt__['metalk8s.archive_info_from_iso'](archive)
        name = solution_info['name']
        machine_name = name.replace(' ', '-').lower()
        version = solution_info['version']

        result[machine_name].append({
            'name': name,
            'id': '{}-{}'.format(machine_name, version),
            'mountpoint': mountpoint,
            'archive': archive,
            'version': version,
        })

    return dict(result)
