import { call, put, takeLatest } from 'redux-saga/effects';
import * as Api from '../../services/api';
import { convertK8sMemoryToBytes, prettifyBytes } from '../../services/utils';

// Actions
const FETCH_NODES = 'FETCH_NODES';
export const SET_NODES = 'SET_NODES';

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

// Sagas
export function* fetchNodes() {
  try {
    const result = yield call(Api.getNodes);
    yield put(
      setNodesAction(
        result.body.items.map(node => ({
          name: node.metadata.name,
          cpu: node.status.capacity.cpu,
          memory: prettifyBytes(
            convertK8sMemoryToBytes(node.status.capacity.memory),
            2
          ).value,
          pods: node.status.capacity.pods
        }))
      )
    );
  } catch (e) {}
}

export function* nodesSaga() {
  yield takeLatest(FETCH_NODES, fetchNodes);
}
