import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';

import { REFRESH_TIMEOUT } from '../../constants';

// Actions
const REFRESH_STACK = 'REFRESH_STACK';
const STOP_REFRESH_STACK = 'STOP_REFRESH_STACK';

const UPDATE_STACK = 'UPDATE_STACK';
const EDIT_STACK = 'EDIT_STACK';

// Reducer
const defaultState = {
  list: [],
  isRefreshing: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE_STACK:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Action Creators
export const refreshStackAction = () => {
  return { type: REFRESH_STACK };
};

export const stopRefreshStackAction = () => {
  return { type: STOP_REFRESH_STACK };
};

export const updateStackAction = payload => {
  return { type: UPDATE_STACK, payload };
};

export const editStackAction = payload => {
  return { type: EDIT_STACK, payload };
};

// Sagas
export function* fetchStack() {
  const results = yield call(ApiK8s.getStack);
  if (!results.error) {
    yield put(
      updateStackAction({
        list: results.body.items.map(cr => {
          return {
            name: cr.metadata.name,
            status: 'Ready',
            description: cr.spec.description,
            version: '0.0.1'
          };
        })
      })
    );
  }
  return results;
}

export function* editStack({ payload }) {
  const { name, namespaces, replicas, version } = payload;
  const body = {
    apiVersion: 'example-solution.metalk8s.scality.com/v1alpha1',
    kind: 'Example',
    metadata: {
      name: name
    },
    spec: {
      replicas: parseInt(replicas, 10),
      version
    }
  };

  const result = yield call(ApiK8s.updateStack, body, namespaces, name);

  if (!result.error) {
    yield call(fetchStack);
    yield call(history.push, `/stacks`);
  }
}

export function* refreshStack() {
  yield put(
    updateStackAction({
      isRefreshing: true
    })
  );
  const results = yield call(fetchStack);
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(state => state.app.stack.isRefreshing);
    if (isRefreshing) {
      yield call(refreshStack);
    }
  }
}

export function* stopRefreshStack() {
  yield put(
    updateStackAction({
      isRefreshing: false
    })
  );
}

export function* stackSaga() {
  yield takeEvery(REFRESH_STACK, refreshStack);
  yield takeEvery(STOP_REFRESH_STACK, stopRefreshStack);
  yield takeEvery(EDIT_STACK, editStack);
}
