import { call, takeEvery, put } from 'redux-saga/effects';
import * as Api from '../services/api';

// Actions
const FETCH_NODES = 'FETCH_NODES';
const SET_NODES = 'SET_NODES';

// Reducer
const defaultState = {
  nodes: []
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_NODES:
      return { ...state, nodes: action.payload };
    default:
      return state;
  }
}

// Action Creators
export const fetchNodesAction = token => {
  return { type: FETCH_NODES, token };
};

export const setNodesAction = payload => {
  return { type: SET_NODES, payload };
};

// Sagas
function* fetchNodes(token) {
  try {
    const result = yield call(Api.getNodes, token);
    const nodes = result.body.items.map(node => ({
      name: node.metadata.name,
      cpu: node.status.capacity.cpu,
      memory: node.status.capacity.memory,
      pods: node.status.capacity.pods
    }));
    yield put(setNodesAction(nodes));
  } catch (e) {}
}

export function* nodesSaga() {
  yield takeEvery(FETCH_NODES, fetchNodes);
}
