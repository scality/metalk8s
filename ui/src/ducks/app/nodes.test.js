import { call, put } from 'redux-saga/effects';
import { fetchNodes, createNode, SET_NODES, CREATE_NODE_FAILED } from './nodes';
import * as Api from '../../services/api';
import history from '../../history';

it('update the nodes state when fetchNodes', () => {
  const gen = fetchNodes();

  expect(gen.next().value).toEqual(call(Api.getNodes));

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
              'metalk8s.scality.com/ssh-sudo': 'true',
              'metalk8s.scality.com/workload-plane': 'true',
              'metalk8s.scality.com/control-plane:': 'true'
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
      cpu: '2',
      memory: '1000 KiB',
      creationDate: '2019-29-03',
      control_plane: false,
      statusType: {
        status: 'True',
        type: 'Ready'
      },
      workload_plane: true
    }
  ];

  expect(gen.next(result).value).toEqual(
    put({ type: SET_NODES, payload: nodes })
  );
});

it('create Node success', () => {
  const payload = { test: 'test' };
  const gen = createNode({ payload });
  expect(gen.next().value).toEqual(call(Api.createNode, payload));
  expect(gen.next({ data: null }).value).toEqual(call(fetchNodes));
  expect(gen.next().value).toEqual(call(history.push, '/nodes'));
});

it('create Node fail', () => {
  const payload = { test: 'test' };
  const gen = createNode({ payload });
  expect(gen.next().value).toEqual(call(Api.createNode, payload));
  expect(gen.next({ error: { body: { message: 'error' } } }).value).toEqual(
    put({
      type: CREATE_NODE_FAILED,
      payload: 'error'
    })
  );
});
