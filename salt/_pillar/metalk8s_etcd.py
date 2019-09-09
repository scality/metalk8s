import logging

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_etcd"


def __virtual__():
    return __virtualname__


def _load_members(pillar):
    errors = []
    try:
        members = __salt__['metalk8s_etcd.get_etcd_member_list'](
                    nodes = pillar['metalk8s']['nodes']
                  )
    except Exception as exc:
        members = []
        errors.append(
            'Error while retrieving etcd cluster members: {}'.format(
                exc
            )
        )
    result = {'members': members}

    if errors:
        result.update(__utils__['pillar_utils.errors_to_dict'](errors))
    return result


def ext_pillar(minion_id, pillar):
    return {"metalk8s": {'etcd': _load_members(pillar)}}
