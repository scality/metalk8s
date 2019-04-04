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
  const result = yield call(Api.getNodes);
  if (!result.error) {
    yield put(
      setNodesAction(
        result.body.items.map(node => ({
          name: node.metadata.name,
          status:
            node.status.conditions &&
            node.status.conditions.find(conditon => conditon.type === 'Ready')
              .status === 'True'
              ? 'Ready'
              : 'Not Ready',
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

export function* nodesSaga() {
  yield takeLatest(FETCH_NODES, fetchNodes);
}
