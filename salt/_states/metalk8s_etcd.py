# -*- coding: utf-8 -*-
import logging

log = logging.getLogger(__name__)


__virtualname__ = 'metalk8s_etcd'


def __virtual__():
    if 'metalk8s_kubernetes.ping' not in __salt__:
        return False, '`metalk8s_kubernetes.ping` not available'
    else:
        return __virtualname__


def member_present(name, peer_urls):
    """Ensure that the etcd node is in cluster

    Arguements:
        peer_urls ([str]): List of the etcd peer urls to add
    """
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    # Check that peer urls does not exist
    if __salt__['metalk8s_etcd.urls_exist_in_cluster'](peer_urls):
        ret['result'] = True
        ret['comment'] = 'Peer URLs: {} already exists'.format(
            ' ,'.join(peer_urls)
        )
        return ret

    # Add node
    if __opts__['test']:
        ret['result'] = None
        ret['comment'] = 'Node would be added to the cluster'
        ret['change'] = {'peer_urls': str(', '.join(peer_urls))}
        return ret

    try:
        member = __salt__['metalk8s_etcd.add_etcd_node'](peer_urls)
    except Exception as exc:  # pylint: disable=broad-except
        ret['comment'] = 'Failed to add {} in the cluster: {}'.format(
            name, exc
        )
    else:
        ret['result'] = True
        ret['changes'] = {
            'id': member.id,
            'name': member.name,
            'peer_urls': str(', '.join(member.peer_urls)),
            'client_urls': str(', '.join(member.client_urls)),
        }
        ret['comment'] = 'Node added in etcd cluster'

    return ret
