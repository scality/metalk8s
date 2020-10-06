import {
  all,
  call,
  delay,
  put,
  select,
  take,
  takeEvery,
  takeLatest,
  race,
} from 'redux-saga/effects';

import * as CoreApi from '../../services/k8s/core';
import * as ApiSalt from '../../services/salt/api';
import history from '../../history';
import {
  addNotificationSuccessAction,
  addNotificationErrorAction,
} from './notifications';
import { intl } from '../../translations/IntlGlobalProvider';
import {
  addJobAction,
  JOB_COMPLETED,
  allJobsSelector,
  CONNECT_SALT_API,
} from './salt';
import { REFRESH_TIMEOUT } from '../../constants';
import { nodesCPWPIPsInterface } from '../../services/NodeUtils';
import {
  API_STATUS_READY,
  API_STATUS_NOT_READY,
  API_STATUS_UNKNOWN,
} from '../../constants.js';

// Actions
const FETCH_NODES = 'FETCH_NODES';
const REFRESH_NODES = 'REFRESH_NODES';
const STOP_REFRESH_NODES = 'STOP_REFRESH_NODES';
export const UPDATE_NODES = 'UPDATE_NODES';
const FETCH_CLUSTER_VERSION = 'FETCH_CLUSTER_VERSION';

const CREATE_NODE = 'CREATE_NODE';
export const CREATE_NODE_FAILED = 'CREATE_NODE_FAILED';
const CLEAR_CREATE_NODE_ERROR = 'CLEAR_CREATE_NODE_ERROR';
const DEPLOY_NODE = 'DEPLOY_NODE';

// Todo: We need to handle the refresh
const FETCH_NODES_IPS_INTERFACES = 'FETCH_NODES_IPS_INTERFACES';
const UPDATE_NODES_IPS_INTERFACES = 'UPDATE_NODES_IPS_INTERFACES';

export const ROLE_MASTER = 'node-role.kubernetes.io/master';
export const ROLE_NODE = 'node-role.kubernetes.io/node';
export const ROLE_ETCD = 'node-role.kubernetes.io/etcd';
export const ROLE_BOOTSTRAP = 'node-role.kubernetes.io/bootstrap';
export const ROLE_INFRA = 'node-role.kubernetes.io/infra';
export const ROLE_PREFIX = 'node-role.kubernetes.io';

export const CLUSTER_VERSION_ANNOTATION =
  'metalk8s.scality.com/cluster-version';

export const roleTaintMap = [
  {
    control_plane: false,
    workload_plane: false,
    bootstrap: true,
    infra: false,
    roles: [ROLE_BOOTSTRAP, ROLE_MASTER, ROLE_ETCD, ROLE_INFRA],
    taints: [
      {
        key: ROLE_BOOTSTRAP,
        effect: 'NoSchedule',
      },
      {
        key: ROLE_INFRA,
        effect: 'NoSchedule',
      },
    ],
  },
  {
    control_plane: true,
    workload_plane: false,
    bootstrap: false,
    infra: false,
    roles: [ROLE_MASTER, ROLE_ETCD],
    taints: [
      {
        key: ROLE_MASTER,
        effect: 'NoSchedule',
      },
      {
        key: ROLE_ETCD,
        effect: 'NoSchedule',
      },
    ],
  },
  {
    control_plane: false,
    workload_plane: true,
    bootstrap: false,
    infra: false,
    roles: [ROLE_NODE],
  },
  {
    control_plane: false,
    workload_plane: false,
    bootstrap: false,
    infra: true,
    roles: [ROLE_INFRA],
    taints: [
      {
        key: ROLE_INFRA,
        effect: 'NoSchedule',
      },
    ],
  },
  {
    control_plane: true,
    workload_plane: true,
    bootstrap: false,
    infra: false,
    roles: [ROLE_ETCD, ROLE_MASTER, ROLE_NODE],
  },
  {
    control_plane: true,
    workload_plane: false,
    bootstrap: false,
    infra: true,
    roles: [ROLE_ETCD, ROLE_MASTER, ROLE_INFRA],
    taints: [
      {
        key: ROLE_INFRA,
        effect: 'NoSchedule',
      },
    ],
  },
  {
    control_plane: false,
    workload_plane: true,
    bootstrap: false,
    infra: true,
    roles: [ROLE_INFRA],
  },
  {
    control_plane: true,
    workload_plane: true,
    bootstrap: false,
    infra: true,
    roles: [ROLE_ETCD, ROLE_MASTER, ROLE_INFRA],
  },
];

// Reducer
const defaultState = {
  clusterVersion: '',
  list: [],
  isRefreshing: false,
  isLoading: false,
  IPsInfo: {},
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE_NODES:
      return { ...state, ...action.payload };
    case CREATE_NODE_FAILED:
      return {
        ...state,
        errors: { create_node: action.payload },
      };
    case CLEAR_CREATE_NODE_ERROR:
      return {
        ...state,
        errors: { create_node: null },
      };
    case UPDATE_NODES_IPS_INTERFACES:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Action Creators
export const fetchNodesAction = () => {
  return { type: FETCH_NODES };
};

export const fetchClusterVersionAction = () => {
  return { type: FETCH_CLUSTER_VERSION };
};

export const updateNodesAction = (payload) => {
  return { type: UPDATE_NODES, payload };
};

export const createNodeAction = (payload) => {
  return { type: CREATE_NODE, payload };
};

export const clearCreateNodeErrorAction = () => {
  return { type: CLEAR_CREATE_NODE_ERROR };
};

export const deployNodeAction = (payload) => {
  return { type: DEPLOY_NODE, payload };
};

export const refreshNodesAction = () => {
  return { type: REFRESH_NODES };
};

export const stopRefreshNodesAction = () => {
  return { type: STOP_REFRESH_NODES };
};

export const fetchNodesIPsInterfaceAction = () => {
  return { type: FETCH_NODES_IPS_INTERFACES };
};

export const updateNodesIPsInterfacesAction = (payload) => {
  return { type: UPDATE_NODES_IPS_INTERFACES, payload };
};

// Selectors
export const clusterVersionSelector = (state) => state.app.nodes.clusterVersion;
export const nodesRefreshingSelector = (state) => state.app.nodes.isRefreshing;
export const isSaltAPIAuthenticatedSelector = (state) => state.login.salt;

// Sagas
export function* fetchClusterVersion() {
  const result = yield call(CoreApi.getKubeSystemNamespace);
  if (!result.error) {
    yield put(
      updateNodesAction({
        clusterVersion: result.body.items.length
          ? result.body.items[0].metadata.annotations[
              CLUSTER_VERSION_ANNOTATION
            ]
          : '',
      }),
    );
  }
}

export function* fetchNodes() {
  yield put(updateNodesAction({ isLoading: true }));

  const allJobs = yield select(allJobsSelector);
  const deployingNodes = allJobs
    .filter((job) => job.type === 'deploy-node' && !job.completed)
    .map((job) => job.node);

  const result = yield call(CoreApi.getNodes);
  if (!result.error) {
    yield put(
      updateNodesAction({
        list: result?.body?.items?.map((node) => {
          const statusType =
            node.status.conditions &&
            node.status.conditions.find(
              (conditon) => conditon.type === 'Ready',
            );

          // Store the name of conditions which the status are True in the array, except "Ready" condition, which we can know from the `status` field.
          // Given the available conditions ("DiskPressure", "MemoryPressure", "PIDPressure", "NetworkUnavailable", "Unschedulable")
          const conditions = node?.status?.conditions?.reduce((acc, cond) => {
            if (cond.status === 'True' && cond?.type && cond?.type !== 'Ready')
              acc.push(cond.type);
            return acc;
          }, []);

          let status;
          if (statusType && statusType.status === 'True') {
            status = API_STATUS_READY;
          } else if (statusType && statusType.status === 'False') {
            status = API_STATUS_NOT_READY;
          } else {
            status = API_STATUS_UNKNOWN;
          }

          // the Roles of the Node should be the ones that are stored in the labels `node-role.kubernetes.io/<role-name>`
          const nodeRolesLabels = Object.keys(
            node.metadata.labels,
          ).filter((label) => label.startsWith(ROLE_PREFIX));

          const nodeRoles = nodeRolesLabels?.map((nRL) => nRL.split('/')[1]);

          return {
            name: node.metadata.name,
            metalk8s_version:
              node.metadata.labels['metalk8s.scality.com/version'],
            status: status,
            conditions: conditions,
            roles: nodeRoles.join(' / '),
            deploying: deployingNodes.includes(node.metadata.name),
            internalIP: node?.status?.addresses?.find(
              (ip) => ip.type === 'InternalIP',
            ).address,
            creationTimestamp: node?.metadata?.creationTimestamp,
            kubeletVersion: node?.status?.nodeInfo?.kubeletVersion,
          };
        }),
      }),
    );
  }
  yield delay(1000); // To make sure that the loader is visible for at least 1s
  yield put(updateNodesAction({ isLoading: false }));
  return result;
}

export function* createNode({ payload }) {
  const clusterVersion = yield select(clusterVersionSelector);
  const body = {
    metadata: {
      name: payload.name,
      labels: {
        'metalk8s.scality.com/version': clusterVersion,
      },
      annotations: {
        'metalk8s.scality.com/ssh-user': payload.ssh_user,
        'metalk8s.scality.com/ssh-port': payload.ssh_port,
        'metalk8s.scality.com/ssh-host': payload.hostName_ip,
        'metalk8s.scality.com/ssh-key-path': payload.ssh_key_path,
        'metalk8s.scality.com/ssh-sudo': payload.sudo_required.toString(),
      },
    },
    spec: {},
  };

  const roleTaintMatched = roleTaintMap.find(
    (role) =>
      role.control_plane === payload.control_plane &&
      role.workload_plane === payload.workload_plane &&
      role.infra === payload.infra,
  );

  if (roleTaintMatched) {
    body.spec.taints = roleTaintMatched.taints;
    // initialise the labels
    for (const role of roleTaintMatched.roles) {
      body.metadata.labels[role] = '';
    }
  }

  const result = yield call(CoreApi.createNode, body);

  if (!result.error) {
    yield call(fetchNodes);
    yield call(history.push, '/nodes');
    yield put(
      addNotificationSuccessAction({
        title: intl.translate('node_creation'),
        message: intl.translate('node_creation_success', {
          name: payload.name,
        }),
      }),
    );
  } else {
    yield put({
      type: CREATE_NODE_FAILED,
      payload: result.error.body.message,
    });
    yield put(
      addNotificationErrorAction({
        title: intl.translate('node_creation'),
        message: intl.translate('node_creation_failed', { name: payload.name }),
      }),
    );
  }
}

export function* deployNode({ payload }) {
  const clusterVersion = yield select(
    (state) => state.app.nodes.clusterVersion,
  );
  const result = yield call(ApiSalt.deployNode, payload.name, clusterVersion);
  if (result.error) {
    yield put(
      addNotificationErrorAction({
        title: intl.translate('node_deployment'),
        message: result.error,
      }),
    );
  } else {
    yield put(
      addJobAction({
        type: 'deploy-node',
        jid: result.return[0].jid,
        node: payload.name,
      }),
    );
    yield call(fetchNodes);
  }
}

export function* notifyDeployJobCompleted({ payload: { jid, status } }) {
  const jobs = yield select((state) => state.app.salt.jobs);
  const job = jobs.find((job) => job.jid === jid);
  if (job?.type === 'deploy-node') {
    if (status.success) {
      yield put(
        addNotificationSuccessAction({
          title: intl.translate('node_deployment'),
          message: intl.translate('node_deployment_success', {
            name: job.node,
          }),
        }),
      );
    } else {
      yield put(
        addNotificationErrorAction({
          title: intl.translate('node_deployment'),
          message: intl.translate('node_deployment_failed', {
            name: job.node,
            step: status.step,
            reason: status.comment,
          }),
        }),
      );
    }
  }
}

export function* refreshNodes() {
  yield put(
    updateNodesAction({
      isRefreshing: true,
    }),
  );

  const result = yield call(fetchNodes);
  if (!result.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(nodesRefreshingSelector);
    if (isRefreshing) {
      yield call(refreshNodes);
    }
  }
}

export function* stopRefreshNodes() {
  yield put(
    updateNodesAction({
      isRefreshing: false,
    }),
  );
}

export function* fetchNodesIPsInterface() {
  let result;
  // Check if Salt API is already authenticated
  // If not, wait for the CONNECT_SALT_API action.
  const isSaltAPIAuthenticated = yield select(isSaltAPIAuthenticatedSelector);
  if (isSaltAPIAuthenticated) {
    result = yield call(ApiSalt.getNodesIPsInterfaces);
  } else {
    // eslint-disable-next-line no-unused-vars
    const { success, failure, timeout } = yield race({
      success: take(CONNECT_SALT_API),
      timeout: delay(5000),
    });
    if (success) {
      result = yield call(ApiSalt.getNodesIPsInterfaces);
    }
    //TODO: We're missing proper error-handling here.
  }

  if (!result.error) {
    const nodesIPsInfo = result.return[0];
    const IPsInfo = Object.keys(nodesIPsInfo)?.reduce((ipsInfo, nodeName) => {
      ipsInfo[nodeName] = nodesCPWPIPsInterface(nodesIPsInfo[nodeName]);
      return ipsInfo;
    }, {});

    yield put(
      updateNodesIPsInterfacesAction({
        IPsInfo: IPsInfo,
      }),
    );
  }
}

export function* nodesSaga() {
  yield all([
    takeEvery(FETCH_NODES, fetchNodes),
    takeEvery(CREATE_NODE, createNode),
    takeLatest(DEPLOY_NODE, deployNode),
    takeEvery(REFRESH_NODES, refreshNodes),
    takeEvery(STOP_REFRESH_NODES, stopRefreshNodes),
    takeEvery(FETCH_CLUSTER_VERSION, fetchClusterVersion),
    takeEvery(JOB_COMPLETED, notifyDeployJobCompleted),
    takeEvery(FETCH_NODES_IPS_INTERFACES, fetchNodesIPsInterface),
  ]);
}
