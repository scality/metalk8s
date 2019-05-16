import { call, put, takeLatest, takeEvery, select } from 'redux-saga/effects';
import * as Api from '../../services/api';
import { convertK8sMemoryToBytes, prettifyBytes } from '../../services/utils';
import history from '../../history';
import { layoutLoadingAction } from './layout';
// Actions
const FETCH_NODES = 'FETCH_NODES';
export const SET_NODES = 'SET_NODES';
const CREATE_NODE = 'CREATE_NODE';
export const CREATE_NODE_FAILED = 'CREATE_NODE_FAILED';
const CLEAR_CREATE_NODE_ERROR = 'CLEAR_CREATE_NODE_ERROR';
const DEPLOY_NODE = 'DEPLOY_NODE';

// Reducer
const defaultState = {
  list: []
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
  yield put(layoutLoadingAction(true));
  const salt = yield select(state => state.login.salt);
  const api = yield select(state => state.config.api);
  const result = yield call(
    Api.deployNode,
    api.url_salt,
    salt.data.return[0].token,
    payload.name,
    payload.metalk8s_version
  );
  yield put(layoutLoadingAction(false));
  if (result.error) {
    alert('Deployement Error'); // TODO: to be removed when we have the notification component
  } else if (result.data.return[0].retcode === 1) {
    alert('Deployement Failed: retcode=1'); // TODO: to be removed when we have the notification component
  } else {
    yield call(fetchNodes);
  }
}

export function* nodesSaga() {
  yield takeLatest(FETCH_NODES, fetchNodes);
  yield takeEvery(CREATE_NODE, createNode);
  yield takeEvery(DEPLOY_NODE, deployNode);
}
