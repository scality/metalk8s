import {
  take,
  call,
  put,
  takeLatest,
  takeEvery,
  select
} from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';

import * as Api from '../../services/api';
import { convertK8sMemoryToBytes, prettifyBytes } from '../../services/utils';
import history from '../../history';

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

let eventSrc, channel;

// Reducer
const defaultState = {
  list: [],
  events: {}
};

const isRolePresentInLabels = (node, role) => {
  return (
    node.metadata &&
    node.metadata.labels &&
    node.metadata.labels[role] !== undefined
  );
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
  const result = yield call(Api.getNodes);
  if (!result.error) {
    yield put(
      setNodesAction(
        result.body.items.map(node => {
          const statusType =
            node.status.conditions &&
            node.status.conditions.find(conditon => conditon.type === 'Ready');

          return {
            name: node.metadata.name,
            metalk8s_version:
              node.metadata.labels['metalk8s.scality.com/version'],
            statusType: statusType,
            cpu: node.status.capacity && node.status.capacity.cpu,
            control_plane: isRolePresentInLabels(node, Api.ROLE_MASTER),
            workload_plane: isRolePresentInLabels(node, Api.ROLE_NODE),
            bootstrap: isRolePresentInLabels(node, Api.ROLE_BOOTSTRAP),
            memory:
              node.status.capacity &&
              prettifyBytes(
                convertK8sMemoryToBytes(node.status.capacity.memory),
                2
              ).value,
            creationDate: node.metadata.creationTimestamp
          };
        })
      )
    );
  }
}

export function* createNode({ payload }) {
  const result = yield call(Api.createNode, payload);

  if (!result.error) {
    yield call(fetchNodes);
    yield call(history.push, '/nodes');
  } else {
    yield put({
      type: CREATE_NODE_FAILED,
      payload: result.error.body.message
    });
  }
}

export function* deployNode({ payload }) {
  const salt = yield select(state => state.login.salt);
  const api = yield select(state => state.config.api);
  const result = yield call(
    Api.deployNode,
    api.url_salt,
    salt.data.return[0].token,
    payload.name,
    payload.metalk8s_version
  );
  if (result.error) {
    alert('Deployement Error'); // TODO: to be removed when we have the notification component
  } else if (result.data.return[0].retcode === 1) {
    alert('Deployement Failed: retcode=1'); // TODO: to be removed when we have the notification component
  } else {
    yield call(history.push, `/nodes/deploy/${result.data.return[0].jid}`);
  }
}

export function subSSE(eventSrc, jid) {
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
  eventSrc = new EventSource(`${payload.url}/events?token=${payload.token}`);
  channel = yield call(subSSE, eventSrc);
}

export function* subscribeDeployEvents({ jid }) {
  while (true) {
    const msg = yield take(channel);
    const data = JSON.parse(msg.data);
    if (data.tag.includes(jid)) {
      yield put(updateDeployEventsAction({ jid, msg: data }));
    }
  }
}

export function* nodesSaga() {
  yield takeLatest(FETCH_NODES, fetchNodes);
  yield takeEvery(CREATE_NODE, createNode);
  yield takeEvery(DEPLOY_NODE, deployNode);
  yield takeEvery(CONNECT_SALT_API, sseSagas);
  yield takeEvery(SUBSCRIBE_DEPLOY_EVENTS, subscribeDeployEvents);
}
