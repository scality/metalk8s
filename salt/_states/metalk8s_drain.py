from __future__ import absolute_import

import logging


log = logging.getLogger(__name__)


def node_drained(
        name,
        **kwargs
):
    ret = {
        'name': name,
        'changes': {},
        'result': False,
        'comment': ''
    }

    if __opts__['test']:
        ret['result'] = None
        ret['comment'] = 'The node {0} is going to be drained'.format(name)
        return ret

    res = __salt__['metalk8s_kubernetes.node_drain'](name, **kwargs)

    ret['changes'][name] = {
        'old': [],
        'new': []
    }

    return ret
