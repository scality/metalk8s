import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
import { REFRESH_TIMEOUT } from '../../constants';

// Actions
const REFRESH_VERSION_SERVER = 'REFRESH_VERSION_SERVER';
const STOP_REFRESH_VERSION_SERVER = 'STOP_REFRESH_VERSION_SERVER';
const CREATE_VERSION_SERVER = 'CREATE_VERSION_SERVER';

const UPDATE_VERSION_SERVER = 'UPDATE_VERSION_SERVER';
const EDIT_VERSION_SERVER = 'EDIT_VERSION_SERVER';

// Reducer
const defaultState = {
  list: [],
  isRefreshing: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE_VERSION_SERVER:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Action Creators
export const refreshVersionServerAction = stack => {
  return { type: REFRESH_VERSION_SERVER, stack };
};

export const stopRefreshVersionServerAction = () => {
  return { type: STOP_REFRESH_VERSION_SERVER };
};

export const updateVersionServerAction = payload => {
  return { type: UPDATE_VERSION_SERVER, payload };
};

export const editVersionServerAction = payload => {
  return { type: EDIT_VERSION_SERVER, payload };
};

export const createVersionServerAction = payload => {
  return { type: CREATE_VERSION_SERVER, payload };
};

// Sagas
export function* fetchVersionServer(namespaces) {
  const results = yield call(ApiK8s.getVersionServer, namespaces);
  if (!results.error) {
    yield put(
      updateVersionServerAction({
        list: results.body.items.map(cr => {
          return {
            name: cr.metadata.name,
            replicas: cr.spec.replicas,
            version: cr.spec.version,
            kind: results.body.kind
          };
        })
      })
    );
  }
  return results;
}

export function* createVersionServer({ payload }) {
  const { name, stack, replicas, version } = payload;
  const body = {
    apiVersion: 'example-solution.metalk8s.scality.com/v1alpha1',
    kind: 'VersionServer',
    metadata: {
      name: name
    },
    spec: {
      replicas: parseInt(replicas, 10),
      version
    }
  };

  const result = yield call(
    ApiK8s.createVersionServer,
    body,
    `${stack}-example-solution`
  );
  if (!result.error) {
    yield call(fetchVersionServer, `${stack}-example-solution`);
    yield call(history.push, `/stacks/${stack}`);
  }
}

export function* editVersionServer({ payload }) {
  const { name, stack, replicas, version } = payload;
  const body = {
    apiVersion: 'example-solution.metalk8s.scality.com/v1alpha1',
    kind: 'VersionServer',
    metadata: {
      name: name
    },
    spec: {
      replicas: parseInt(replicas, 10),
      version
    }
  };
  const result = yield call(
    ApiK8s.updateVersionServer,
    body,
    `${stack}-example-solution`,
    name
  );

  if (!result.error) {
    yield call(fetchVersionServer, `${stack}-example-solution`);
    yield call(history.push, `/stacks/${stack}`);
  }
}

export function* refreshVersionServer({ stack }) {
  yield put(
    updateVersionServerAction({
      isRefreshing: true
    })
  );
  const results = yield call(fetchVersionServer, `${stack}-example-solution`);
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.versionServer.isRefreshing
    );
    if (isRefreshing) {
      yield call(refreshVersionServer, { stack });
    }
  }
}

export function* stopRefreshVersionServer() {
  yield put(
    updateVersionServerAction({
      isRefreshing: false
    })
  );
}

export function* versionServerSaga() {
  yield takeEvery(REFRESH_VERSION_SERVER, refreshVersionServer);
  yield takeEvery(STOP_REFRESH_VERSION_SERVER, stopRefreshVersionServer);
  yield takeEvery(CREATE_VERSION_SERVER, createVersionServer);
  yield takeEvery(EDIT_VERSION_SERVER, editVersionServer);
}
