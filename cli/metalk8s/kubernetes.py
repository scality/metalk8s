import kubernetes.client
import kubernetes.config

ROLE_BOOTSTRAP = 'bootstrap'
ROLE_CA = 'ca'
ROLE_ETCD = 'etcd'
ROLE_MASTER = 'master'
ROLE_NODE = 'node'
ROLE_INFRA = 'infra'

_ROLE_PREFIX = 'node-role.kubernetes.io/'


def calculate_taints(roles):
    raise NotImplementedError


def calculate_labels(roles):
    raise NotImplementedError


def roles_from_node(node):
    raise NotImplementedError
