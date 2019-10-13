import logging
from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_solutions"


def __virtual__():
    return __virtualname__


def _load_solutions(bootstrap_id):
    """Load Solutions information."""
    errors = []
    try:
        config_data = __salt__['metalk8s_solutions.read_config']()
    except KeyError:
        return __utils__['pillar_utils.errors_to_dict']([
            "Failed to load 'metalk8s_solutions' module."
        ])
    except (IOError, CommandExecutionError) as exc:
        config_data = {}
        errors.append(
            "Error when reading Solutions config file: {}".format(exc)
        )

    try:
        available = __salt__['saltutil.cmd'](
            tgt=bootstrap_id,
            fun='metalk8s.list_available_solutions',
        )[bootstrap_id]['ret']
    except Exception as exc:
        available = {}
        errors.append(
            "Error when listing available Solutions: {}".format(exc)
        )

    try:
        active = __salt__['metalk8s_solutions.list_active']()
    except Exception as exc:
        active = {}
        errors.append(
            "Error when listing active Solution versions: {}".format(exc)
        )

    log.info(available)

    # Set `active` flag on active Solution versions
    for solution, versions in available.items():
        active_version = active.get(solution)
        if active_version is None:
            continue

        for version_info in versions:
            version_info['active'] = version_info['version'] == active_version

    result = {
        'available': available,
        'config': config_data,
    }

    if errors:
        result.update(__utils__['pillar_utils.errors_to_dict'](errors))

    return result


def ext_pillar(minion_id, pillar):
    pillar_nodes = pillar.get('metalk8s', {}).get('nodes', {})
    bootstrap_nodes = [
        node_name for node_name, node_info in pillar_nodes.items()
        if 'bootstrap' in node_info['roles']
    ]
    assert len(bootstrap_nodes) == 1, (
        'Multiple bootstrap Nodes are not supported yet.'
    )
    bootstrap_id = bootstrap_nodes[0]
    return {"metalk8s": {'solutions': _load_solutions(bootstrap_id)}}
