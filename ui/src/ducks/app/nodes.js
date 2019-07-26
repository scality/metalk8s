import {
  all,
  take,
  call,
  put,
  takeLatest,
  takeEvery,
  select,
  delay
} from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';

import * as ApiK8s from '../../services/k8s/api';
import * as ApiSalt from '../../services/salt/api';
import history from '../../history';
import {
  addNotificationSuccessAction,
  addNotificationErrorAction
} from './notifications';

import { intl } from '../../translations/IntlGlobalProvider';
import { addJobAction, removeJobAction } from './salt.js';
import { REFRESH_TIMEOUT } from '../../constants';

import {
  getJobStatusFromPrintJob,
  getJidFromNameLocalStorage,
  addJobLocalStorage,
  removeJobLocalStorage,
  getJobStatusFromEventRet,
  getNameFromJidLocalStorage
} from '../../services/salt/utils';

import {
  STATUS_READY,
  STATUS_NOT_READY,
  STATUS_UNKNOWN
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
const CONNECT_SALT_API = 'CONNECT_SALT_API';
const UPDATE_EVENTS = 'UPDATE_EVENTS';
const SUBSCRIBE_DEPLOY_EVENTS = 'SUBSCRIBE_DEPLOY_EVENTS';

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
        effect: 'NoSchedule'
      },
      {
        key: ROLE_INFRA,
        effect: 'NoSchedule'
      }
    ]
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
        effect: 'NoSchedule'
      },
      {
        key: ROLE_ETCD,
        effect: 'NoSchedule'
      }
    ]
  },
  {
    control_plane: false,
    workload_plane: true,
    bootstrap: false,
    infra: false,
    roles: [ROLE_NODE]
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
        effect: 'NoSchedule'
      }
    ]
  },
  {
    control_plane: true,
    workload_plane: true,
    bootstrap: false,
    infra: false,
    roles: [ROLE_ETCD, ROLE_MASTER, ROLE_NODE]
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
        effect: 'NoSchedule'
      }
    ]
  },
  {
    control_plane: false,
    workload_plane: true,
    bootstrap: false,
    infra: true,
    roles: [ROLE_INFRA]
  },
  {
    control_plane: true,
    workload_plane: true,
    bootstrap: false,
    infra: true,
    roles: [ROLE_ETCD, ROLE_MASTER, ROLE_INFRA]
  }
];

// Reducer
const defaultState = {
  clusterVersion: '',
  list: [],
  events: {},
  isRefreshing: false,
  isLoading: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE_NODES:
      return { ...state, ...action.payload };
    case CREATE_NODE_FAILED:
      return {
        ...state,
        errors: { create_node: action.payload }
      };
    case CLEAR_CREATE_NODE_ERROR:
      return {
        ...state,
        errors: { create_node: null }
      };
    case UPDATE_EVENTS:
      return {
        ...state,
        events: {
          ...state.events,
          [action.payload.jid]: state.events[action.payload.jid]
            ? [...state.events[action.payload.jid], action.payload.msg]
            : [action.payload.msg]
        }
      };
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

export const updateNodesAction = payload => {
  return { type: UPDATE_NODES, payload };
};

export const createNodeAction = payload => {
  return { type: CREATE_NODE, payload };
};

export const clearCreateNodeErrorAction = () => {
  return { type: CLEAR_CREATE_NODE_ERROR };
};

export const deployNodeAction = payload => {
  return { type: DEPLOY_NODE, payload };
};

export const connectSaltApiAction = payload => {
  return { type: CONNECT_SALT_API, payload };
};

export const updateDeployEventsAction = payload => {
  return { type: UPDATE_EVENTS, payload };
};

export const subscribeDeployEventsAction = jid => {
  return { type: SUBSCRIBE_DEPLOY_EVENTS, jid };
};

export const refreshNodesAction = () => {
  return { type: REFRESH_NODES };
};

export const stopRefreshNodesAction = () => {
  return { type: STOP_REFRESH_NODES };
};

// Sagas
export function* fetchClusterVersion() {
  const result = yield call(ApiK8s.getKubeSystemNamespace);
  if (!result.error) {
    yield put(
      updateNodesAction({
        clusterVersion: result.body.items.length
          ? result.body.items[0].metadata.annotations[
              CLUSTER_VERSION_ANNOTATION
            ]
          : ''
      })
    );
  }
}

export function* fetchNodes() {
  yield put(
    updateNodesAction({
      isLoading: true
    })
  );
  const result = yield call(ApiK8s.getNodes);
  if (!result.error) {
    yield put(
      updateNodesAction({
        list: result.body.items.map(node => {
          const statusType =
            node.status.conditions &&
            node.status.conditions.find(conditon => conditon.type === 'Ready');
          let status;
          if (statusType && statusType.status === 'True') {
            status = STATUS_READY;
          } else if (statusType && statusType.status === 'False') {
            status = STATUS_NOT_READY;
          } else {
            status = STATUS_UNKNOWN;
          }

          const roleTaintMatched = roleTaintMap.find(item => {
            const nodeRoles = Object.keys(node.metadata.labels).filter(role =>
              role.includes(ROLE_PREFIX)
            );

            return (
              nodeRoles.length === item.roles.length &&
              nodeRoles.every(role => item.roles.includes(role)) &&
              (item.taints && node.spec.taints
                ? node.spec.taints.every(taint =>
                    item.taints.find(item => item.key === taint.key)
                  )
                : item.taints === node.spec.taints)
            );
          });
          const rolesLabel = [];
          if (roleTaintMatched) {
            if (roleTaintMatched.bootstrap) {
              rolesLabel.push(intl.translate('bootstrap'));
            }
            if (roleTaintMatched.control_plane) {
              rolesLabel.push(intl.translate('control_plane'));
            }
            if (roleTaintMatched.workload_plane) {
              rolesLabel.push(intl.translate('workload_plane'));
            }
            if (roleTaintMatched.infra) {
              rolesLabel.push(intl.translate('infra'));
            }
          }

          return {
            name: node.metadata.name,
            metalk8s_version:
              node.metadata.labels['metalk8s.scality.com/version'],
            status: status,
            control_plane: roleTaintMatched && roleTaintMatched.control_plane,
            workload_plane: roleTaintMatched && roleTaintMatched.workload_plane,
            bootstrap: roleTaintMatched && roleTaintMatched.bootstrap,
            infra: roleTaintMatched && roleTaintMatched.infra,
            jid: getJidFromNameLocalStorage(node.metadata.name),
            roles: rolesLabel.join(' / ')
          };
        })
      })
    );

    yield all(
      result.body.items.map(node => {
        return call(getJobStatus, node.metadata.name);
      })
    );
  }
  yield delay(1000); // To make sur that the loader is visible for at least 1s
  yield put(
    updateNodesAction({
      isLoading: false
    })
  );
  return result;
}

export function* getJobStatus(name) {
  const jid = getJidFromNameLocalStorage(name);
  if (jid) {
    const result = yield call(ApiSalt.printJob, jid);
    const status = {
      name,
      ...getJobStatusFromPrintJob(result, jid)
    };
    if (status.completed) {
      yield put(removeJobAction(jid));
      removeJobLocalStorage(jid);
      if (status.success) {
        yield put(
          addNotificationSuccessAction({
            title: intl.translate('node_deployment'),
            message: intl.translate('node_deployment_success', { name })
          })
        );
      } else {
        yield put(
          addNotificationErrorAction({
            title: intl.translate('node_deployment'),
            message: intl.translate('node_deployment_failed', {
              name,
              step: status.step_id,
              reason: status.comment
            })
          })
        );
      }
    }
  }
}

export function* createNode({ payload }) {
  const clusterVersion = yield select(state => state.app.nodes.clusterVersion);
  const body = {
    metadata: {
      name: payload.name,
      labels: {
        'metalk8s.scality.com/version': clusterVersion
      },
      annotations: {
        'metalk8s.scality.com/ssh-user': payload.ssh_user,
        'metalk8s.scality.com/ssh-port': payload.ssh_port,
        'metalk8s.scality.com/ssh-host': payload.hostName_ip,
        'metalk8s.scality.com/ssh-key-path': payload.ssh_key_path,
        'metalk8s.scality.com/ssh-sudo': payload.sudo_required.toString()
      }
    },
    spec: {}
  };

  const roleTaintMatched = roleTaintMap.find(
    role =>
      role.control_plane === payload.control_plane &&
      role.workload_plane === payload.workload_plane &&
      role.infra === payload.infra
  );

  if (roleTaintMatched) {
    body.spec.taints = roleTaintMatched.taints;
    roleTaintMatched.roles.map(role => (body.metadata.labels[role] = ''));
  }

  const result = yield call(ApiK8s.createNode, body);

  if (!result.error) {
    yield call(fetchNodes);
    yield call(history.push, '/nodes');
    yield put(
      addNotificationSuccessAction({
        title: intl.translate('node_creation'),
        message: intl.translate('node_creation_success', { name: payload.name })
      })
    );
  } else {
    yield put({
      type: CREATE_NODE_FAILED,
      payload: result.error.body.message
    });
    yield put(
      addNotificationErrorAction({
        title: intl.translate('node_creation'),
        message: intl.translate('node_creation_failed', { name: payload.name })
      })
    );
  }
}

export function* deployNode({ payload }) {
  const clusterVersion = yield select(state => state.app.nodes.clusterVersion);
  const result = yield call(ApiSalt.deployNode, payload.name, clusterVersion);
  if (result.error) {
    yield put(
      addNotificationErrorAction({
        title: intl.translate('node_deployment'),
        message: result.error
      })
    );
  } else {
    yield call(subscribeDeployEvents, { jid: result.return[0].jid });
    addJobLocalStorage(result.return[0].jid, payload.name);
    yield call(fetchNodes);
  }
}

export function subSSE(eventSrc) {
  const subs = emitter => {
    eventSrc.onmessage = msg => {
      emitter(msg);
    };
    eventSrc.onerror = () => {
      emitter(END);
    };
    return () => {
      eventSrc.close();
    };
  };
  return eventChannel(subs);
}

export function* sseSagas({ payload }) {
  const eventSrc = new EventSource(
    `${payload.url}/events?token=${payload.token}`
  );
  const channel = yield call(subSSE, eventSrc);
  while (true) {
    const msg = yield take(channel);
    const data = JSON.parse(msg.data);
    const jobs = yield select(state => state.app.salt.jobs);

    yield all(
      jobs.map(jid => {
        if (data.tag.includes(jid)) {
          return call(updateDeployEvents, jid, data);
        }
        return data;
      })
    );
  }
}

export function* updateDeployEvents(jid, msg) {
  yield put(updateDeployEventsAction({ jid, msg }));
  if (msg.tag.includes('/ret')) {
    const name = getNameFromJidLocalStorage(jid);
    const status = {
      name,
      ...getJobStatusFromEventRet(msg.data)
    };
    if (status.completed) {
      yield put(removeJobAction(jid));
      removeJobLocalStorage(jid);
      if (status.success) {
        yield put(
          addNotificationSuccessAction({
            title: intl.translate('node_deployment'),
            message: intl.translate('node_deployment_success', { name })
          })
        );
      } else {
        yield put(
          addNotificationErrorAction({
            title: intl.translate('node_deployment'),
            message: intl.translate('node_deployment_failed', {
              name,
              step: status.step_id,
              reason: status.comment
            })
          })
        );
      }
    }
  }
}

export function* subscribeDeployEvents({ jid }) {
  const jobs = yield select(state => state.app.salt.jobs);
  if (!jobs.includes(jid)) {
    yield put(addJobAction(jid));
  }
}

export function* refreshNodes() {
  yield put(
    updateNodesAction({
      isRefreshing: true
    })
  );

  const result = yield call(fetchNodes);
  if (!result.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(state => state.app.nodes.isRefreshing);
    if (isRefreshing) {
      yield call(refreshNodes);
    }
  }
}

export function* stopRefreshNodes() {
  yield put(
    updateNodesAction({
      isRefreshing: false
    })
  );
}

export function* nodesSaga() {
  yield takeEvery(FETCH_NODES, fetchNodes);
  yield takeEvery(CREATE_NODE, createNode);
  yield takeLatest(DEPLOY_NODE, deployNode);
  yield takeEvery(CONNECT_SALT_API, sseSagas);
  yield takeEvery(SUBSCRIBE_DEPLOY_EVENTS, subscribeDeployEvents);
  yield takeEvery(REFRESH_NODES, refreshNodes);
  yield takeEvery(STOP_REFRESH_NODES, stopRefreshNodes);
  yield takeEvery(FETCH_CLUSTER_VERSION, fetchClusterVersion);
}
