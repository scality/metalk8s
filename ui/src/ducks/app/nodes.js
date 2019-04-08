import { call, put, takeLatest } from 'redux-saga/effects';
import * as Api from '../../services/api';
import { convertK8sMemoryToBytes, prettifyBytes } from '../../services/utils';

// Actions
const FETCH_NODES = 'FETCH_NODES';
export const SET_NODES = 'SET_NODES';
const DELETE_NODE = 'DELETE_NODE';
const DELETE_NODE_FAILED = 'DELETE_NODE_FAILED';
const DELETE_NODE_SUCCESS = 'DELETE_NODE_SUCCESS';

// Reducer
const defaultState = {
  list: []
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_NODES:
      return { ...state, list: action.payload };
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

export const deleteNodeAction = payload => {
  return { type: DELETE_NODE, payload };
};

// Sagas
export function* fetchNodes() {
  const result = yield call(Api.getNodes);
  if (!result.error) {
    yield put(
      setNodesAction(
        result.body.items.map(node => ({
          name: node.metadata.name,
          status:
            node.status.conditions &&
            node.status.conditions.find(conditon => conditon.type === 'Ready')
              .status,
          cpu: node.status.capacity && node.status.capacity.cpu,
          memory:
            node.status.capacity &&
            prettifyBytes(
              convertK8sMemoryToBytes(node.status.capacity.memory),
              2
            ).value,
          creationDate: node.metadata.creationTimestamp
        }))
      )
    );
  }
}

export function* deleteNode({ payload }) {
  const result = yield call(Api.deleteNode, payload.name);
  if (result.error) {
    yield put({
      type: DELETE_NODE_FAILED, // Will be managed by the Notification component
      payload: result.error.response.data
    });
  } else {
    yield call(fetchNodes);
    yield put({
      type: DELETE_NODE_SUCCESS, // Will be managed by the Notification component
      payload: payload.name
    });
  }
}

export function* nodesSaga() {
  yield takeLatest(FETCH_NODES, fetchNodes);
  yield takeLatest(DELETE_NODE, deleteNode);
}
