import {
  all,
  take,
  call,
  put,
  takeLatest,
  takeEvery,
  select
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

import {
  getJobStatusFromPrintJob,
  getJidFromNameLocalStorage,
  addJobLocalStorage,
  removeJobLocalStorage,
  getJobStatusFromEventRet,
  getNameFromJidLocalStorage
} from '../../services/salt/utils';

// Actions
const FETCH_NODES = 'FETCH_NODES';
export const SET_NODES = 'SET_NODES';
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
  list: [],
  events: {}
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_NODES:
      return { ...state, list: action.payload };
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

export const setNodesAction = payload => {
  return { type: SET_NODES, payload };
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

// Sagas
export function* fetchNodes() {
  const result = yield call(ApiK8s.getNodes);
  if (!result.error) {
    yield put(
      setNodesAction(
        result.body.items.map(node => {
          const statusType =
            node.status.conditions &&
            node.status.conditions.find(conditon => conditon.type === 'Ready');
          let status;
          if (statusType && statusType.status === 'True') {
            status = intl.translate('ready');
          } else if (statusType && statusType.status === 'False') {
            status = intl.translate('not_ready');
          } else {
            status = intl.translate('unknown');
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
      )
    );

    yield all(
      result.body.items.map(node => {
        return call(getJobStatus, node.metadata.name);
      })
    );
  }
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
  const body = {
    metadata: {
      name: payload.name,
      labels: {
        'metalk8s.scality.com/version': payload.version
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
  const result = yield call(
    ApiSalt.deployNode,
    payload.name,
    payload.metalk8s_version
  );
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

export function* nodesSaga() {
  yield takeLatest(FETCH_NODES, fetchNodes);
  yield takeEvery(CREATE_NODE, createNode);
  yield takeLatest(DEPLOY_NODE, deployNode);
  yield takeEvery(CONNECT_SALT_API, sseSagas);
  yield takeEvery(SUBSCRIBE_DEPLOY_EVENTS, subscribeDeployEvents);
}
