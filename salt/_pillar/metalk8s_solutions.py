import logging
from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_solutions"


def __virtual__():
    return __virtualname__


def _load_solutions():
    """Load Solutions from ConfigMap and config file."""
    errors = []
    try:
        deployed = (
            __salt__['metalk8s_solutions.get_solutions_from_configmap']()
        )
    except KeyError:
        return __utils__['pillar_utils.errors_to_dict']([
            "Failed to load 'metalk8s_solutions' module."
        ])
    except Exception as exc:
        deployed = {}
        errors.append(
            "Error when retrieving ConfigMap 'metalk8s-solutions': {}".format(
                exc
            )
        )

    try:
        configured = (
            __salt__['metalk8s_solutions.get_solutions_list_from_configfile']()
        )
    except (IOError, CommandExecutionError) as exc:
        configured = []
        errors.append(
            "Error when reading Solutions config file: {}".format(exc)
        )

    result = {
        'configured': configured,
        'deployed': deployed,
    }

    if errors:
        result.update(__utils__['pillar_utils.errors_to_dict'](errors))

    return result


def ext_pillar(minion_id, pillar):
    solutions = _load_solutions
    return {"metalk8s": {'solutions': _load_solutions()}}
