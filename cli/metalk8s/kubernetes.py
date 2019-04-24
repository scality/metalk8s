import kubernetes.config

ROLE_BOOTSTRAP = 'bootstrap'
ROLE_CA = 'ca'
ROLE_ETCD = 'etcd'
ROLE_MASTER = 'master'
ROLE_NODE = 'node'
ROLE_INFRA = 'infra'

_ROLE_PREFIX = 'node-role.kubernetes.io/'

TAINT_BOOTSTRAP = kubernetes.client.V1Taint(
    key='{}{}'.format(_ROLE_PREFIX, ROLE_BOOTSTRAP),
    effect='NoSchedule',
)
TAINT_ETCD = kubernetes.client.V1Taint(
    key='{}{}'.format(_ROLE_PREFIX, ROLE_ETCD),
    effect='NoSchedule',
)
TAINT_MASTER = kubernetes.client.V1Taint(
    key='{}{}'.format(_ROLE_PREFIX, ROLE_MASTER),
    effect='NoSchedule',
)
TAINT_INFRA = kubernetes.client.V1Taint(
    key='{}{}'.format(_ROLE_PREFIX, ROLE_INFRA),
    effect='NoSchedule',
)


def calculate_taints(roles):
    # 'node' trumps everything
    if ROLE_NODE in roles:
        return []

    # 'infra' only sets that taint
    if ROLE_INFRA in roles:
        return [TAINT_INFRA]

    return [
        taint
        for (role, taint) in [
            (ROLE_MASTER, TAINT_MASTER),
            (ROLE_ETCD, TAINT_ETCD),
            (ROLE_BOOTSTRAP, TAINT_BOOTSTRAP),
            ]
        if role in roles
    ]

def calculate_labels(roles):
    return {
        '{}{}'.format(_ROLE_PREFIX, role): ''
        for role in roles
    }
