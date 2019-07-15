import { call, put, all } from 'redux-saga/effects';
import { fetchNodes, createNode, SET_NODES, CREATE_NODE_FAILED } from './nodes';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
import { getJobStatus } from './nodes.js';

const formPayload = {
  control_plane: true,
  hostName_ip: '172.21.254.44',
  infra: true,
  name: 'node1dd',
  ssh_key_path: '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
  ssh_port: '22',
  ssh_user: 'dqsd',
  sudo_required: true,
  version: '2.0',
  workload_plane: true
};

const bodyRequest = {
  metadata: {
    annotations: {
      'metalk8s.scality.com/ssh-host': '172.21.254.44',
      'metalk8s.scality.com/ssh-key-path':
        '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
      'metalk8s.scality.com/ssh-port': '22',
      'metalk8s.scality.com/ssh-sudo': 'true',
      'metalk8s.scality.com/ssh-user': 'dqsd'
    },
    labels: {
      'metalk8s.scality.com/version': '2.0',
      'node-role.kubernetes.io/etcd': '',
      'node-role.kubernetes.io/infra': '',
      'node-role.kubernetes.io/master': ''
    },
    name: 'node1dd'
  },
  spec: {}
};

it('update the control plane nodes state when fetchNodes', () => {
  const gen = fetchNodes();

  expect(gen.next().value).toEqual(call(ApiK8s.getNodes));
  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'boostrap',
            creationTimestamp: '2019-29-03',
            annotations: {
              'metalk8s.scality.com/ssh-user': 'vagrant',
              'metalk8s.scality.com/ssh-port': '22',
              'metalk8s.scality.com/ssh-host': '172.21.254.7',
              'metalk8s.scality.com/ssh-key-path':
                '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
              'metalk8s.scality.com/ssh-sudo': 'true'
            },
            labels: {
              'node-role.kubernetes.io/etcd': '',
              'node-role.kubernetes.io/master': '',
              'metalk8s.scality.com/version': '2.0'
            }
          },
          status: {
            capacity: {
              cpu: '2',
              memory: '1000ki'
            },
            conditions: [
              {
                type: 'Ready',
                status: 'True'
              }
            ]
          },
          spec: {
            taints: [
              {
                key: 'node-role.kubernetes.io/master',
                effect: 'NoSchedule'
              },
              {
                key: 'node-role.kubernetes.io/etcd',
                effect: 'NoSchedule'
              }
            ]
          }
        }
      ]
    }
  };

  const nodes = [
    {
      name: 'boostrap',
      workload_plane: false,
      control_plane: true,
      bootstrap: false,
      infra: false,
      status: 'Ready',
      jid: undefined,
      metalk8s_version: '2.0',
      roles: 'Control Plane'
    }
  ];

  expect(gen.next(result).value).toEqual(
    put({ type: SET_NODES, payload: nodes })
  );
  expect(gen.next(result).value).toEqual(all([call(getJobStatus, 'boostrap')]));
});

it('update the bootstrap nodes state when fetchNodes', () => {
  const gen = fetchNodes();

  expect(gen.next().value).toEqual(call(ApiK8s.getNodes));

  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'boostrap',
            creationTimestamp: '2019-29-03',
            annotations: {
              'metalk8s.scality.com/ssh-user': 'vagrant',
              'metalk8s.scality.com/ssh-port': '22',
              'metalk8s.scality.com/ssh-host': '172.21.254.7',
              'metalk8s.scality.com/ssh-key-path':
                '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
              'metalk8s.scality.com/ssh-sudo': 'true'
            },
            labels: {
              'node-role.kubernetes.io/bootstrap': '',
              'node-role.kubernetes.io/etcd': '',
              'node-role.kubernetes.io/master': '',
              'node-role.kubernetes.io/infra': '',
              'metalk8s.scality.com/version': '2.0'
            }
          },
          status: {
            capacity: {
              cpu: '2',
              memory: '1000ki'
            },
            conditions: [
              {
                type: 'Ready',
                status: 'True'
              }
            ]
          },
          spec: {
            taints: [
              {
                key: 'node-role.kubernetes.io/bootstrap',
                effect: 'NoSchedule'
              },
              {
                key: 'node-role.kubernetes.io/infra',
                effect: 'NoSchedule'
              }
            ]
          }
        }
      ]
    }
  };

  const nodes = [
    {
      name: 'boostrap',
      workload_plane: false,
      control_plane: false,
      infra: false,
      bootstrap: true,
      status: 'Ready',
      jid: undefined,
      metalk8s_version: '2.0',
      roles: 'Bootstrap'
    }
  ];

  expect(gen.next(result).value).toEqual(
    put({ type: SET_NODES, payload: nodes })
  );

  expect(gen.next(result).value).toEqual(all([call(getJobStatus, 'boostrap')]));
});

it('update the workload plane nodes state when fetchNodes', () => {
  const gen = fetchNodes();

  expect(gen.next().value).toEqual(call(ApiK8s.getNodes));

  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'boostrap',
            creationTimestamp: '2019-29-03',
            annotations: {
              'metalk8s.scality.com/ssh-user': 'vagrant',
              'metalk8s.scality.com/ssh-port': '22',
              'metalk8s.scality.com/ssh-host': '172.21.254.7',
              'metalk8s.scality.com/ssh-key-path':
                '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
              'metalk8s.scality.com/ssh-sudo': 'true'
            },
            labels: {
              'node-role.kubernetes.io/node': '',
              'metalk8s.scality.com/version': '2.0'
            }
          },
          status: {
            capacity: {
              cpu: '2',
              memory: '1000ki'
            },
            conditions: [
              {
                type: 'Ready',
                status: 'True'
              }
            ]
          },
          spec: {}
        }
      ]
    }
  };

  const nodes = [
    {
      name: 'boostrap',
      workload_plane: true,
      control_plane: false,
      bootstrap: false,
      infra: false,
      status: 'Ready',
      jid: undefined,
      metalk8s_version: '2.0',
      roles: 'Workload Plane'
    }
  ];

  expect(gen.next(result).value).toEqual(
    put({ type: SET_NODES, payload: nodes })
  );
  expect(gen.next(result).value).toEqual(all([call(getJobStatus, 'boostrap')]));
});

it('update the control plane/workload plane nodes state when fetchNodes', () => {
  const gen = fetchNodes();

  expect(gen.next().value).toEqual(call(ApiK8s.getNodes));

  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'boostrap',
            creationTimestamp: '2019-29-03',
            annotations: {
              'metalk8s.scality.com/ssh-user': 'vagrant',
              'metalk8s.scality.com/ssh-port': '22',
              'metalk8s.scality.com/ssh-host': '172.21.254.7',
              'metalk8s.scality.com/ssh-key-path':
                '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
              'metalk8s.scality.com/ssh-sudo': 'true'
            },
            labels: {
              'node-role.kubernetes.io/node': '',
              'node-role.kubernetes.io/etcd': '',
              'node-role.kubernetes.io/master': '',
              'metalk8s.scality.com/version': '2.0'
            }
          },
          status: {
            capacity: {
              cpu: '2',
              memory: '1000ki'
            },
            conditions: [
              {
                type: 'Ready',
                status: 'True'
              }
            ]
          },
          spec: {}
        }
      ]
    }
  };

  const nodes = [
    {
      name: 'boostrap',
      workload_plane: true,
      control_plane: true,
      infra: false,
      bootstrap: false,
      status: 'Ready',
      jid: undefined,
      metalk8s_version: '2.0',
      roles: 'Control Plane / Workload Plane'
    }
  ];
  expect(gen.next(result).value).toEqual(
    put({ type: SET_NODES, payload: nodes })
  );

  expect(gen.next(result).value).toEqual(all([call(getJobStatus, 'boostrap')]));
});

it('update the control plane/workload plane/ infra nodes state when fetchNodes', () => {
  const gen = fetchNodes();

  expect(gen.next().value).toEqual(call(ApiK8s.getNodes));

  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'boostrap',
            creationTimestamp: '2019-29-03',
            annotations: {
              'metalk8s.scality.com/ssh-user': 'vagrant',
              'metalk8s.scality.com/ssh-port': '22',
              'metalk8s.scality.com/ssh-host': '172.21.254.7',
              'metalk8s.scality.com/ssh-key-path':
                '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
              'metalk8s.scality.com/ssh-sudo': 'true'
            },
            labels: {
              'node-role.kubernetes.io/infra': '',
              'node-role.kubernetes.io/etcd': '',
              'node-role.kubernetes.io/master': '',
              'metalk8s.scality.com/version': '2.0'
            }
          },
          status: {
            capacity: {
              cpu: '2',
              memory: '1000ki'
            },
            conditions: [
              {
                type: 'Ready',
                status: 'True'
              }
            ]
          },
          spec: {}
        }
      ]
    }
  };

  const nodes = [
    {
      name: 'boostrap',
      workload_plane: true,
      control_plane: true,
      infra: true,
      bootstrap: false,
      status: 'Ready',
      jid: undefined,
      metalk8s_version: '2.0',
      roles: 'Control Plane / Workload Plane / Infra'
    }
  ];
  expect(gen.next(result).value).toEqual(
    put({ type: SET_NODES, payload: nodes })
  );

  expect(gen.next(result).value).toEqual(all([call(getJobStatus, 'boostrap')]));
});

it('update the infra nodes state when fetchNodes', () => {
  const gen = fetchNodes();

  expect(gen.next().value).toEqual(call(ApiK8s.getNodes));

  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'boostrap',
            creationTimestamp: '2019-29-03',
            annotations: {
              'metalk8s.scality.com/ssh-user': 'vagrant',
              'metalk8s.scality.com/ssh-port': '22',
              'metalk8s.scality.com/ssh-host': '172.21.254.7',
              'metalk8s.scality.com/ssh-key-path':
                '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
              'metalk8s.scality.com/ssh-sudo': 'true'
            },
            labels: {
              'node-role.kubernetes.io/infra': '',
              'metalk8s.scality.com/version': '2.0'
            }
          },
          status: {
            capacity: {
              cpu: '2',
              memory: '1000ki'
            },
            conditions: [
              {
                type: 'Ready',
                status: 'True'
              }
            ]
          },
          spec: {
            taints: [
              {
                key: 'node-role.kubernetes.io/infra',
                effect: 'NoSchedule'
              }
            ]
          }
        }
      ]
    }
  };

  const nodes = [
    {
      name: 'boostrap',
      workload_plane: false,
      control_plane: false,
      infra: true,
      bootstrap: false,
      status: 'Ready',
      jid: undefined,
      metalk8s_version: '2.0',
      roles: 'Infra'
    }
  ];
  expect(gen.next(result).value).toEqual(
    put({ type: SET_NODES, payload: nodes })
  );

  expect(gen.next(result).value).toEqual(all([call(getJobStatus, 'boostrap')]));
});

it('update the infra / Worload Plane  nodes state when fetchNodes', () => {
  const gen = fetchNodes();

  expect(gen.next().value).toEqual(call(ApiK8s.getNodes));

  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'boostrap',
            creationTimestamp: '2019-29-03',
            annotations: {
              'metalk8s.scality.com/ssh-user': 'vagrant',
              'metalk8s.scality.com/ssh-port': '22',
              'metalk8s.scality.com/ssh-host': '172.21.254.7',
              'metalk8s.scality.com/ssh-key-path':
                '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
              'metalk8s.scality.com/ssh-sudo': 'true'
            },
            labels: {
              'node-role.kubernetes.io/infra': '',
              'metalk8s.scality.com/version': '2.0'
            }
          },
          status: {
            capacity: {
              cpu: '2',
              memory: '1000ki'
            },
            conditions: [
              {
                type: 'Ready',
                status: 'True'
              }
            ]
          },
          spec: {}
        }
      ]
    }
  };

  const nodes = [
    {
      name: 'boostrap',
      workload_plane: true,
      control_plane: false,
      infra: true,
      bootstrap: false,
      status: 'Ready',
      jid: undefined,
      metalk8s_version: '2.0',
      roles: 'Workload Plane / Infra'
    }
  ];
  expect(gen.next(result).value).toEqual(
    put({ type: SET_NODES, payload: nodes })
  );

  expect(gen.next(result).value).toEqual(all([call(getJobStatus, 'boostrap')]));
});

it('update the infra / Controle Plane nodes state when fetchNodes', () => {
  const gen = fetchNodes();

  expect(gen.next().value).toEqual(call(ApiK8s.getNodes));

  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'boostrap',
            creationTimestamp: '2019-29-03',
            annotations: {
              'metalk8s.scality.com/ssh-user': 'vagrant',
              'metalk8s.scality.com/ssh-port': '22',
              'metalk8s.scality.com/ssh-host': '172.21.254.7',
              'metalk8s.scality.com/ssh-key-path':
                '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
              'metalk8s.scality.com/ssh-sudo': 'true'
            },
            labels: {
              'node-role.kubernetes.io/infra': '',
              'node-role.kubernetes.io/master': '',
              'node-role.kubernetes.io/etcd': '',
              'metalk8s.scality.com/version': '2.0'
            }
          },
          status: {
            capacity: {
              cpu: '2',
              memory: '1000ki'
            },
            conditions: [
              {
                type: 'Ready',
                status: 'True'
              }
            ]
          },
          spec: {
            taints: [
              {
                key: 'node-role.kubernetes.io/infra',
                effect: 'NoSchedule'
              }
            ]
          }
        }
      ]
    }
  };

  const nodes = [
    {
      name: 'boostrap',
      workload_plane: false,
      control_plane: true,
      infra: true,
      bootstrap: false,
      status: 'Ready',
      jid: undefined,
      metalk8s_version: '2.0',
      roles: 'Control Plane / Infra'
    }
  ];
  expect(gen.next(result).value).toEqual(
    put({ type: SET_NODES, payload: nodes })
  );

  expect(gen.next(result).value).toEqual(all([call(getJobStatus, 'boostrap')]));
});
it('create Node success - CP,WP,I', () => {
  const gen = createNode({ payload: formPayload });
  expect(gen.next().value).toEqual(call(ApiK8s.createNode, bodyRequest));
  expect(gen.next({ data: null }).value).toEqual(call(fetchNodes));
  expect(gen.next().value).toEqual(call(history.push, '/nodes'));
});

it('create Node fail - CP,WP,I', () => {
  const gen = createNode({ payload: formPayload });
  expect(gen.next().value).toEqual(call(ApiK8s.createNode, bodyRequest));
  expect(gen.next({ error: { body: { message: 'error' } } }).value).toEqual(
    put({
      type: CREATE_NODE_FAILED,
      payload: 'error'
    })
  );
});

it('create Node success - CP', () => {
  const request = {
    metadata: {
      annotations: {
        'metalk8s.scality.com/ssh-host': '172.21.254.44',
        'metalk8s.scality.com/ssh-key-path':
          '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
        'metalk8s.scality.com/ssh-port': '22',
        'metalk8s.scality.com/ssh-sudo': 'true',
        'metalk8s.scality.com/ssh-user': 'dqsd'
      },
      labels: {
        'metalk8s.scality.com/version': '2.0',
        'node-role.kubernetes.io/etcd': '',
        'node-role.kubernetes.io/master': ''
      },
      name: 'node1dd'
    },
    spec: {
      taints: [
        {
          effect: 'NoSchedule',
          key: 'node-role.kubernetes.io/master'
        },
        {
          effect: 'NoSchedule',
          key: 'node-role.kubernetes.io/etcd'
        }
      ]
    }
  };

  const gen = createNode({
    payload: { ...formPayload, workload_plane: false, infra: false }
  });
  expect(gen.next().value).toEqual(call(ApiK8s.createNode, request));
  expect(gen.next({ data: null }).value).toEqual(call(fetchNodes));
  expect(gen.next().value).toEqual(call(history.push, '/nodes'));
});

it('create Node success - WP', () => {
  const request = {
    metadata: {
      annotations: {
        'metalk8s.scality.com/ssh-host': '172.21.254.44',
        'metalk8s.scality.com/ssh-key-path':
          '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
        'metalk8s.scality.com/ssh-port': '22',
        'metalk8s.scality.com/ssh-sudo': 'true',
        'metalk8s.scality.com/ssh-user': 'dqsd'
      },
      labels: {
        'metalk8s.scality.com/version': '2.0',
        'node-role.kubernetes.io/node': ''
      },
      name: 'node1dd'
    },
    spec: {}
  };

  const gen = createNode({
    payload: { ...formPayload, control_plane: false, infra: false }
  });
  expect(gen.next().value).toEqual(call(ApiK8s.createNode, request));
  expect(gen.next({ data: null }).value).toEqual(call(fetchNodes));
  expect(gen.next().value).toEqual(call(history.push, '/nodes'));
});

it('create Node success - Infra', () => {
  const request = {
    metadata: {
      annotations: {
        'metalk8s.scality.com/ssh-host': '172.21.254.44',
        'metalk8s.scality.com/ssh-key-path':
          '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
        'metalk8s.scality.com/ssh-port': '22',
        'metalk8s.scality.com/ssh-sudo': 'true',
        'metalk8s.scality.com/ssh-user': 'dqsd'
      },
      labels: {
        'metalk8s.scality.com/version': '2.0',
        'node-role.kubernetes.io/infra': ''
      },
      name: 'node1dd'
    },
    spec: {
      taints: [
        {
          effect: 'NoSchedule',
          key: 'node-role.kubernetes.io/infra'
        }
      ]
    }
  };

  const gen = createNode({
    payload: { ...formPayload, control_plane: false, workload_plane: false }
  });
  expect(gen.next().value).toEqual(call(ApiK8s.createNode, request));
  expect(gen.next({ data: null }).value).toEqual(call(fetchNodes));
  expect(gen.next().value).toEqual(call(history.push, '/nodes'));
});

it('create Node success - CP,WP', () => {
  const request = {
    metadata: {
      annotations: {
        'metalk8s.scality.com/ssh-host': '172.21.254.44',
        'metalk8s.scality.com/ssh-key-path':
          '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
        'metalk8s.scality.com/ssh-port': '22',
        'metalk8s.scality.com/ssh-sudo': 'true',
        'metalk8s.scality.com/ssh-user': 'dqsd'
      },
      labels: {
        'metalk8s.scality.com/version': '2.0',
        'node-role.kubernetes.io/master': '',
        'node-role.kubernetes.io/etcd': '',
        'node-role.kubernetes.io/node': ''
      },
      name: 'node1dd'
    },
    spec: {}
  };

  const gen = createNode({
    payload: { ...formPayload, infra: false }
  });
  expect(gen.next().value).toEqual(call(ApiK8s.createNode, request));
  expect(gen.next({ data: null }).value).toEqual(call(fetchNodes));
  expect(gen.next().value).toEqual(call(history.push, '/nodes'));
});

it('create Node success - CP,Infra', () => {
  const request = {
    metadata: {
      annotations: {
        'metalk8s.scality.com/ssh-host': '172.21.254.44',
        'metalk8s.scality.com/ssh-key-path':
          '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
        'metalk8s.scality.com/ssh-port': '22',
        'metalk8s.scality.com/ssh-sudo': 'true',
        'metalk8s.scality.com/ssh-user': 'dqsd'
      },
      labels: {
        'metalk8s.scality.com/version': '2.0',
        'node-role.kubernetes.io/master': '',
        'node-role.kubernetes.io/etcd': '',
        'node-role.kubernetes.io/infra': ''
      },
      name: 'node1dd'
    },
    spec: {
      taints: [
        {
          effect: 'NoSchedule',
          key: 'node-role.kubernetes.io/infra'
        }
      ]
    }
  };

  const gen = createNode({
    payload: { ...formPayload, workload_plane: false }
  });
  expect(gen.next().value).toEqual(call(ApiK8s.createNode, request));
  expect(gen.next({ data: null }).value).toEqual(call(fetchNodes));
  expect(gen.next().value).toEqual(call(history.push, '/nodes'));
});

it('create Node success - WP,Infra', () => {
  const request = {
    metadata: {
      annotations: {
        'metalk8s.scality.com/ssh-host': '172.21.254.44',
        'metalk8s.scality.com/ssh-key-path':
          '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
        'metalk8s.scality.com/ssh-port': '22',
        'metalk8s.scality.com/ssh-sudo': 'true',
        'metalk8s.scality.com/ssh-user': 'dqsd'
      },
      labels: {
        'metalk8s.scality.com/version': '2.0',
        'node-role.kubernetes.io/infra': ''
      },
      name: 'node1dd'
    },
    spec: {}
  };

  const gen = createNode({
    payload: { ...formPayload, control_plane: false }
  });
  expect(gen.next().value).toEqual(call(ApiK8s.createNode, request));
  expect(gen.next({ data: null }).value).toEqual(call(fetchNodes));
  expect(gen.next().value).toEqual(call(history.push, '/nodes'));
});
