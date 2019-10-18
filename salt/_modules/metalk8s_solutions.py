"""Utility methods for Solutions management.

This module contains minion-local operations, see `metalk8s_solutions_k8s.py`
for the K8s operations in the virtual `metalk8s_solutions` module.
"""
import collections
import errno
import logging

from salt.exceptions import CommandExecutionError
import yaml

log = logging.getLogger(__name__)

CONFIG_FILE = '/etc/metalk8s/solutions.yaml'
CONFIG_KIND = 'SolutionsConfiguration'
SUPPORTED_CONFIG_VERSIONS = [
    'solutions.metalk8s.scality.com/{}'.format(version)
    for version in ['v1alpha1']
]

__virtualname__ = 'metalk8s_solutions'


def __virtual__():
    if 'metalk8s.archive_info_from_iso' not in __salt__:
        return False, "Failed to load 'metalk8s' module."
    return __virtualname__


def _load_config_file(create=False):
    try:
        with open(CONFIG_FILE, 'r') as fd:
            return yaml.safe_load(fd)
    except IOError as exc:
        if create and exc.errno == errno.ENOENT:
            return _create_config_file()
        msg = 'Failed to load "{}": {}'.format(CONFIG_FILE, str(exc))
        raise CommandExecutionError(message=msg)


def _write_config_file(data):
    try:
        with open(CONFIG_FILE, 'w') as fd:
            yaml.safe_dump(data, fd)
    except Exception as exc:
        msg = 'Failed to write Solutions config file at "{}": {}'.format(
            CONFIG_FILE, exc
        )
        raise CommandExecutionError(message=msg)


def _create_config_file():
    default_data = {
        'apiVersion': SUPPORTED_CONFIG_VERSIONS[0],
        'kind': CONFIG_KIND,
        'archives': [],
        'active': {},
    }
    _write_config_file(default_data)
    return default_data


def read_config(create=False):
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

    If `create` is set to True, this will create an empty configuration file
    if it does not exist yet.
    """
    config = _load_config_file(create=create)

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


def configure_archive(archive, create_config=False, removed=False):
    """Add (or remove) a Solution archive in the config file."""
    config = read_config(create=create_config)

    if removed:
        try:
            config['archives'].remove(archive)
        except ValueError:
            pass
    else:
        if archive not in config['archives']:
            config['archives'].append(archive)

    _write_config_file(config)
    return True


def activate_solution(solution, version='latest'):
    """Set a `version` of a `solution` as being "active"."""
    available = list_available()
    if solution not in available:
        raise CommandExecutionError(
            'Cannot activate Solution "{}": not available'.format(solution)
        )

    # NOTE: this doesn't create a config file, since you can't activate a non-
    #       available version
    config = read_config(create=False)

    if version != 'latest':
        if version not in (info['version'] for info in available[solution]):
            raise CommandExecutionError(
                'Cannot activate version "{}" for Solution "{}": '
                'not available'.format(version, solution)
            )

    config['active'][solution] = version
    _write_config_file(config)
    return True


def deactivate_solution(solution):
    """Remove a `solution` from the "active" section in configuration."""
    config = read_config(create=False)
    config['active'].pop(solution, None)
    _write_config_file(config)
    return True


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
        solution_info = __salt__['metalk8s.archive_info_from_tree'](mountpoint)
        name = solution_info['name']
        machine_name = name.replace(' ', '-').lower()
        version = solution_info['version']

        result[machine_name].append({
            'name': name,
            'id': '{}-{}'.format(machine_name, version),
            'mountpoint': mountpoint,
            'archive': mount_info['alt_device'],
            'version': version,
        })

    return dict(result)
