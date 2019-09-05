import { call, put, takeEvery, delay, select } from 'redux-saga/effects';

import {
  addNotificationSuccessAction,
  addNotificationErrorAction
} from './notifications';
import history from '../../history';
import { intl } from '../../translations/IntlGlobalProvider';
import * as ApiK8s from '../../services/k8s/api';
import { REFRESH_TIMEOUT } from '../../constants';

// Actions
const REFRESH_NAMESPACES = 'REFRESH_NAMESPACES';
const STOP_REFRESH_NAMESPACES = 'STOP_REFRESH_NAMESPACES';
const CREATE_NAMESPACES = 'CREATE_NAMESPACES';
const UPDATE_NAMESPACES = 'UPDATE_NAMESPACES';

const defaultState = {
  list: [],
  isRefreshing: false
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
export const createNamespacesAction = payload => {
  return { type: CREATE_NAMESPACES, payload };
};

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
export function* createNamespaces({ payload }) {
  const body = {
    metadata: {
      name: payload.name
    }
  };
  const result = yield call(ApiK8s.createNamespace, body);
  if (!result.error) {
    yield call(history.push, '/solutions');
    yield put(
      addNotificationSuccessAction({
        title: intl.translate('namespace_creation'),
        message: intl.translate('namespace_creation_success', {
          name: payload.name
        })
      })
    );
  } else {
    yield put(
      addNotificationErrorAction({
        title: intl.translate('namespace_creation'),
        message: intl.translate('node_creation_failed', { name: payload.name })
      })
    );
  }
}

export function* fetchNamespaces() {
  const results = yield call(ApiK8s.getNamespaces);
  if (!results.error) {
    yield put(
      updateNamespacesAction({
        list: results.body.items.map(ns => {
          return {
            name: ns.metadata.name,
            status: ns.status.phase
          };
        })
      })
    );
  }
  return results;
}

export function* refreshNamespaces() {
  yield put(updateNamespacesAction({ isRefreshing: true }));

  const resultFetchNamespaces = yield call(fetchNamespaces);

  if (!resultFetchNamespaces.error) {
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
  yield put(updateNamespacesAction({ isRefreshing: false }));
}

export function* namespacesSaga() {
  yield takeEvery(CREATE_NAMESPACES, createNamespaces);
  yield takeEvery(REFRESH_NAMESPACES, refreshNamespaces);
  yield takeEvery(STOP_REFRESH_NAMESPACES, stopRefreshNamespaces);
}
