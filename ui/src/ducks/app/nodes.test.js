import { call, put, delay, select } from 'redux-saga/effects';
import { cloneableGenerator } from '@redux-saga/testing-utils';
import * as CoreApi from '../../services/k8s/core';
import { REFRESH_TIMEOUT } from '../../constants';
import {
  fetchNodes,
  createNode,
  refreshNodes,
  UPDATE_NODES,
  CREATE_NODE_FAILED,
  clusterVersionSelector,
  nodesRefreshingSelector,
  fetchNodesIPsInterface,
  historySelector
} from './nodes';
import { allJobsSelector } from './salt';
import {
  ADD_NOTIFICATION_SUCCESS,
  ADD_NOTIFICATION_ERROR,
} from './notifications';

// Helpers {{{

const DEFAULT_NAME = 'node1';
const DEFAULT_CLUSTER_VERSION = '2.4.2';

const nodeMetadata = ({
  name = DEFAULT_NAME,
  host = '10.0.0.1',
  version = DEFAULT_CLUSTER_VERSION,
  roles = ['node'],
  keyPath = '/etc/metalk8s/pki/salt_bootstrap',
  port = '22',
  sudo = 'true',
  user = 'centos',
}) => ({
  name: name,
  labels: {
    'metalk8s.scality.com/version': version,
    ...roles.reduce(
      (roleLabels, role) => ({
        ...roleLabels,
        [`node-role.kubernetes.io/${role}`]: '',
      }),
      {},
    ),
  },
  annotations: {
    'metalk8s.scality.com/ssh-host': host,
    'metalk8s.scality.com/ssh-key-path': keyPath,
    'metalk8s.scality.com/ssh-port': port,
    'metalk8s.scality.com/ssh-sudo': sudo,
    'metalk8s.scality.com/ssh-user': user,
  },
});

const nodeForApi = ({ taintRoles = [], showStatus = true, ...props }) => ({
  metadata: nodeMetadata(props),
  status: showStatus
    ? {
        // FIXME: make this generic
        capacity: {
          cpu: '2',
          memory: '1000ki',
        },
        conditions: [
          {
            type: 'Ready',
            status: 'True',
          },
        ],
      }
    : undefined,
  spec: {
    taints: taintRoles.length
      ? taintRoles.map((role) => ({
          key: `node-role.kubernetes.io/${role}`,
          effect: 'NoSchedule',
        }))
      : undefined,
  },
});

const defaultNodeForState = {
  name: DEFAULT_NAME,
  metalk8s_version: DEFAULT_CLUSTER_VERSION,
  status: 'ready',
  deploying: false,
  roles: 'node',
  conditions: [],
};

const formPayload = ({
  name = DEFAULT_NAME,
  host = '10.0.0.1',
  roles = [],
  ssh = {
    keyPath: '/etc/metalk8s/pki/salt_bootstrap',
    port: '22',
    user: 'centos',
    sudo: true,
  },
}) => ({
  name,
  hostName_ip: host,
  ssh_key_path: ssh.keyPath,
  ssh_port: ssh.port,
  ssh_user: ssh.user,
  sudo_required: ssh.sudo,
  control_plane: roles.includes('control-plane'),
  workload_plane: roles.includes('workload-plane'),
  infra: roles.includes('infra'),
});

// }}}

describe('`fetchNodes` saga', () => {
  const gen = cloneableGenerator(fetchNodes)();

  expect(gen.next().value).toEqual(
    put({ type: UPDATE_NODES, payload: { isLoading: true } }),
  );

  expect(gen.next().value).toEqual(select(allJobsSelector));

  const _checkCompletion = (_gen) => {
    expect(_gen.next().value).toEqual(delay(1000));
    expect(_gen.next().value).toEqual(
      put({ type: UPDATE_NODES, payload: { isLoading: false } }),
    );
    expect(_gen.next().value).toEqual(call(fetchNodesIPsInterface));
    expect(_gen.next().done).toBe(true);
  };

  test('has the correct nominal flow', () => {
    const clone = gen.clone();

    const jobs = [];
    expect(clone.next(jobs).value).toEqual(call(CoreApi.getNodes));

    const apiResponse = { body: { items: [] } };
    expect(clone.next(apiResponse).value).toEqual(
      put({ type: UPDATE_NODES, payload: { list: [] } }),
    );

    _checkCompletion(clone);
  });

  test.todo('handles API errors');

  test.each([
    ['completed', true],
    ['in progress', false],
  ])('maps %s deployment Jobs to Nodes', (_, completed) => {
    const clone = gen.clone();
    const jobs = [
      {
        type: 'deploy-node',
        node: DEFAULT_NAME,
        jid: '12345',
        completed,
      },
    ];

    expect(clone.next(jobs).value).toEqual(call(CoreApi.getNodes));

    const apiResponse = { body: { items: [nodeForApi({})] } };
    const expectedNode = { ...defaultNodeForState, deploying: !completed };

    expect(clone.next(apiResponse).value).toEqual(
      put({ type: UPDATE_NODES, payload: { list: [expectedNode] } }),
    );
  });

  test.todo('ignores Jobs not related to Nodes deployment');
  test.todo('attaches Jobs based on Node name');

  // FIXME: this logic is wrong anyway, we don't want to infer roles from
  // taints, maybe display them, but that's all
  test.each([
    [
      ['master', 'etcd'],
      ['master', 'etcd'],
      {
        labels: 'master / etcd',
      },
    ],
    [
      ['bootstrap', 'master', 'etcd', 'infra'],
      ['bootstrap', 'infra'],
      {
        labels: 'bootstrap / master / etcd / infra',
      },
    ],
    [
      ['node'],
      [],
      {
        labels: 'node',
      },
    ],
    [
      ['node', 'master', 'etcd'],
      [],
      {
        labels: 'node / master / etcd',
      },
    ],
    [
      ['infra'],
      ['infra'],
      {
        labels: 'infra',
      },
    ],
    [
      ['infra'],
      [],
      {
        labels: 'infra',
      },
    ],
    [
      ['infra', 'master', 'etcd'],
      ['infra'],
      {
        labels: 'infra / master / etcd',
      },
    ],
  ])('handles Node roles (%j) and taints (%j)', (roles, taints, expected) => {
    const clone = gen.clone();
    expect(clone.next([]).value).toEqual(call(CoreApi.getNodes));

    const apiResponse = {
      body: { items: [nodeForApi({ roles, taintRoles: taints })] },
    };

    const expectedNode = {
      ...defaultNodeForState,
      roles: expected.labels,
    };

    expect(clone.next(apiResponse).value).toEqual(
      put({ type: UPDATE_NODES, payload: { list: [expectedNode] } }),
    );

    _checkCompletion(clone);
  });
});

describe.skip('`createNode` saga', () => {
  test('has the correct nominal flow', () => {
    const gen = createNode({
      payload: formPayload({ roles: ['workload-plane'] }),
    });
    expect(gen.next().value).toEqual(select(clusterVersionSelector));
    expect(gen.next(DEFAULT_CLUSTER_VERSION).value).toEqual(
      call(
        CoreApi.createNode,
        nodeForApi({ showStatus: false, roles: ['node'] }),
      ),
    );
    expect(gen.next({ whatever: 'nominal result' }).value).toEqual(
      call(fetchNodes),
    );
    gen.next().value;
    const historyMock = {push: jest.fn()};
    expect(gen.next({history: historyMock}).value).toEqual(call(historyMock.push, '/nodes'));
    expect(gen.next().value).toMatchObject(
      put({
        type: ADD_NOTIFICATION_SUCCESS,
        payload: {
          title: 'Node creation',
          message: `Node ${DEFAULT_NAME} has been created successfully.`,
          variant: 'success',
          dismissAfter: 5000,
        },
      }),
    );
    expect(gen.next().done).toBe(true);
  });

  test('handles API errors', () => {
    const gen = createNode({
      payload: formPayload({ roles: ['workload-plane'] }),
    });
    expect(gen.next().value).toEqual(select(clusterVersionSelector));
    expect(gen.next(DEFAULT_CLUSTER_VERSION).value).toEqual(
      call(
        CoreApi.createNode,
        nodeForApi({ showStatus: false, roles: ['node'] }),
      ),
    );
    expect(
      gen.next({ error: { body: { message: 'some error happened' } } }).value,
    ).toEqual(
      put({ type: CREATE_NODE_FAILED, payload: 'some error happened' }),
    );
    expect(gen.next().value).toMatchObject(
      put({
        type: ADD_NOTIFICATION_ERROR,
        payload: {
          title: 'Node creation',
          message: `Node ${DEFAULT_NAME} creation has failed.`,
          variant: 'danger',
        },
      }),
    );
    expect(gen.next().done).toBe(true);
  });

  test.each([
    [
      ['control-plane'],
      { roles: ['master', 'etcd'], taints: ['master', 'etcd'] },
    ],
    [['workload-plane'], { roles: ['node'], taints: [] }],
    [['infra'], { roles: ['infra'], taints: ['infra'] }],
    [
      ['control-plane', 'workload-plane'],
      { roles: ['master', 'etcd', 'node'], taints: [] },
    ],
    [
      ['control-plane', 'infra'],
      { roles: ['master', 'etcd', 'infra'], taints: ['infra'] },
    ],
    [['workload-plane', 'infra'], { roles: ['infra'], taints: [] }],
    [
      ['control-plane', 'workload-plane', 'infra'],
      { roles: ['master', 'etcd', 'infra'], taints: [] },
    ],
  ])('handles high-level roles (%j)', (roles, expected) => {
    const gen = createNode({
      payload: formPayload({ roles }),
    });
    expect(gen.next().value).toEqual(select(clusterVersionSelector));
    expect(gen.next(DEFAULT_CLUSTER_VERSION).value).toEqual(
      call(
        CoreApi.createNode,
        nodeForApi({
          showStatus: false,
          roles: expected.roles,
          taintRoles: expected.taints,
        }),
      ),
    );
    expect(gen.next({ whatever: 'nominal result' }).value).toEqual(
      call(fetchNodes),
    );
    gen.next().value;
    const historyMock = {push: jest.fn()};
    expect(gen.next({history: historyMock}).value).toEqual(call(historyMock.push, '/nodes'));
    expect(gen.next().value).toMatchObject(
      put({
        type: ADD_NOTIFICATION_SUCCESS,
        payload: {
          title: 'Node creation',
          message: `Node ${DEFAULT_NAME} has been created successfully.`,
          variant: 'success',
          dismissAfter: 5000,
        },
      }),
    );
    expect(gen.next().done).toBe(true);
  });
});

describe('`refreshNodes` saga', () => {
  // FIXME: avoid recursivity in this saga, see #2035
  test("keeps refreshing if state didn't change", () => {
    const gen = refreshNodes();
    expect(gen.next().value).toEqual(
      put({ type: UPDATE_NODES, payload: { isRefreshing: true } }),
    );
    expect(gen.next().value).toEqual(call(fetchNodes));
    expect(gen.next({ whatever: 'nominal' }).value).toEqual(
      delay(REFRESH_TIMEOUT),
    );
    expect(gen.next().value).toEqual(select(nodesRefreshingSelector));
    // Still refreshing, recurse
    expect(gen.next(true).value).toEqual(call(refreshNodes));
  });

  test('stops refreshing if state changed', () => {
    const gen = refreshNodes();
    expect(gen.next().value).toEqual(
      put({ type: UPDATE_NODES, payload: { isRefreshing: true } }),
    );
    expect(gen.next().value).toEqual(call(fetchNodes));
    expect(gen.next({ whatever: 'nominal' }).value).toEqual(
      delay(REFRESH_TIMEOUT),
    );
    expect(gen.next().value).toEqual(select(nodesRefreshingSelector));
    // Not refreshing anymore, stop this saga
    expect(gen.next(false).done).toBe(true);
  });

  test('stops refreshing on error', () => {
    const gen = refreshNodes();
    expect(gen.next().value).toEqual(
      put({ type: UPDATE_NODES, payload: { isRefreshing: true } }),
    );
    expect(gen.next().value).toEqual(call(fetchNodes));
    expect(gen.next({ error: 'something broke' }).done).toBe(true);
  });
});
