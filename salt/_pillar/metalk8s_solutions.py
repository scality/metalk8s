import os.path
import logging

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_solutions"


def __virtual__():
    return __virtualname__


def _load_solutions():
    """Load configured solutions from configmap."""
    solutions = {
        'configured': \
        __salt__['metalk8s_solutions.get_solutions_from_configmap'](),
        'unconfigured': \
        __salt__['metalk8s_solutions.get_solutions_list_from_configfile']()
    }
    return solutions


def ext_pillar(minion_id, pillar):
    return {"metalk8s": {'solutions': _load_solutions()}}
