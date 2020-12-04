import logging
from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_solutions"


def __virtual__():
    if 'metalk8s_solutions.read_config' not in __salt__:
        return False, "Failed to load 'metalk8s_solution' module."
    return __virtualname__


def _load_solutions():
    """Load Solutions from ConfigMap and config file."""
    result = {
        'available': {},
        'config': {},
        'environments': {},
    }

    try:
        result['config'] = __salt__['metalk8s_solutions.read_config']()
    except CommandExecutionError as exc:
        result['config'] = __utils__['pillar_utils.errors_to_dict']([
            "Error when reading Solutions config file: {}".format(exc)
        ])

    try:
        result['active'] = __salt__['metalk8s_solutions.list_active']()
    except Exception as exc:
        result['active'] = __utils__['pillar_utils.errors_to_dict']([
            "Error when listing active Solution versions: {}".format(exc)
        ])

    try:
        result['environments'] = \
            __salt__['metalk8s_solutions.list_environments']()
    except Exception as exc:
        result['environments'] = __utils__['pillar_utils.errors_to_dict']([
            "Error when listing Solution Environments: {}".format(exc)
        ])

    for key in ['active', 'config', 'environments']:
        __utils__['pillar_utils.promote_errors'](result, key)

    return result


def ext_pillar(minion_id, pillar):
    return {"metalk8s": {'solutions': _load_solutions()}}
