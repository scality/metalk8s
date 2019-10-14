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
    try:
        config_data = __salt__['metalk8s_solutions.read_config']()
    except (IOError, CommandExecutionError) as exc:
        config_data = __utils__['pillar_utils.errors_to_dict']([
            "Error when reading Solutions config file: {}".format(exc)
        ])

    try:
        deployed = __salt__['metalk8s_solutions.list_deployed']()
    except Exception as exc:
        deployed = __utils__['pillar_utils.errors_to_dict']([
            "Error when retrieving ConfigMap 'metalk8s-solutions': {}".format(
                exc
            )
        ])

    result = {
        'config': config_data,
        'deployed': deployed,
    }

    for key in result:
        __utils__['pillar_utils.promote_errors'](result, key)

    return result


def ext_pillar(minion_id, pillar):
    return {"metalk8s": {'solutions': _load_solutions()}}
