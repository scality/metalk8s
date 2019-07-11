import { call, put, all } from 'redux-saga/effects';
import { fetchNodes, createNode, SET_NODES, CREATE_NODE_FAILED } from './nodes';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
import { getJobStatus } from './nodes.js';

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
      bootstrap: true,
      status: 'Ready',
      jid: undefined,
      metalk8s_version: '2.0',
      roles: 'Bootstrap / Control Plane'
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
          }
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
          }
        }
      ]
    }
  };

  const nodes = [
    {
      name: 'boostrap',
      workload_plane: true,
      control_plane: true,
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

it('create Node success', () => {
  const payload = { test: 'test' };
  const gen = createNode({ payload });
  expect(gen.next().value).toEqual(call(ApiK8s.createNode, payload));
  expect(gen.next({ data: null }).value).toEqual(call(fetchNodes));
  expect(gen.next().value).toEqual(call(history.push, '/nodes'));
});

it('create Node fail', () => {
  const payload = { test: 'test' };
  const gen = createNode({ payload });
  expect(gen.next().value).toEqual(call(ApiK8s.createNode, payload));
  expect(gen.next({ error: { body: { message: 'error' } } }).value).toEqual(
    put({
      type: CREATE_NODE_FAILED,
      payload: 'error'
    })
  );
});
