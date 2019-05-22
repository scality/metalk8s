from __future__ import absolute_import

import logging


log = logging.getLogger(__name__)


def _node_set_unschedulable(name, value, **kwargs):
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    action = 'cordon' if value else 'uncordon'

    unschedulable = __salt__[
        'metalk8s_kubernetes.node_unschedulable'](name, **kwargs)

    if unschedulable is None:
        ret['comment'] = 'Unable to get node {0}'.format(name)
        return ret

    if unschedulable == value:
        ret['result'] = True
        ret['comment'] = 'The node {0} is already {1}ed'.format(
            name,
            action
        )
        return ret

    if __opts__['test']:
        ret['comment'] = 'The node {0} is going to be {1}ed'.format(
            name,
            action
        )
        ret['result'] = None
        return ret

    res = __salt__['metalk8s_kubernetes.node_{0}'.format(action)](
        node_name=name,
        **kwargs
    )

    ret['result'] = True
    ret['changes'] = {
        'old': {'unschedulable': unschedulable},
        'new': {'unschedulable': res['spec']['unschedulable']}
    }
    ret['comment'] = 'Node {0} {1}ed'.format(name, action)

    return ret



def node_cordoned(name, **kwargs):
    '''
    Ensures that the named node is cordoned.

    name
        the name of the node
    '''
    return _node_set_unschedulable(name, True, **kwargs)


def node_uncordoned(name, **kwargs):
    '''
    Ensures that the named node is uncordoned.

    name
        the name of the node
    '''
    return _node_set_unschedulable(name, False, **kwargs)
