import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import { REFRESH_TIMEOUT } from '../../constants';
// Actions
const REFRESH_NAMESPACES = 'REFRESH_NAMESPACES';
const STOP_REFRESH_NAMESPACES = 'STOP_REFRESH_NAMESPACES';
const UPDATE_NAMESPACES = 'UPDATE_NAMESPACES';

// Reducer
const defaultState = {
  list: []
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE_NAMESPACES:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Action Creators
export const refreshNamespacesAction = () => {
  return { type: REFRESH_NAMESPACES };
};

export const stopRefreshNamespacesAction = () => {
  return { type: STOP_REFRESH_NAMESPACES };
};

export const updateNamespacesAction = payload => {
  return { type: UPDATE_NAMESPACES, payload };
};

// Sagas
export function* fetchNamespaces() {
  const results = yield call(ApiK8s.getSolutionNamespaces);
  if (!results.error) {
    yield put(
      updateNamespacesAction({
        list: results.body.items
      })
    );
  }
  return results;
}

export function* refreshNamespaces() {
  yield put(
    updateNamespacesAction({
      isRefreshing: true
    })
  );
  const results = yield call(fetchNamespaces);
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.namespaces.isRefreshing
    );
    if (isRefreshing) {
      yield call(refreshNamespaces);
    }
  }
}

export function* stopRefreshNamespaces() {
  yield put(
    updateNamespacesAction({
      isRefreshing: false
    })
  );
}

export function* namespacesSaga() {
  yield takeEvery(REFRESH_NAMESPACES, refreshNamespaces);
  yield takeEvery(STOP_REFRESH_NAMESPACES, stopRefreshNamespaces);
}
