import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
import {
  REFRESH_TIMEOUT,
  SOLUTION_NAME,
  SOLUTION_API_GROUP
} from '../../constants';

// Actions
const REFRESH = 'REFRESH_VERSION_SERVER';
const STOP_REFRESH = 'STOP_REFRESH_VERSION_SERVER';
const CREATE = 'CREATE_VERSION_SERVER';

const UPDATE = 'UPDATE_VERSION_SERVER';
const EDIT = 'EDIT_VERSION_SERVER';

// Reducer
const defaultState = {
  list: [],
  isRefreshing: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Action Creators
export const refreshVersionServerAction = environment => {
  return { type: REFRESH, environment };
};

export const stopRefreshVersionServerAction = () => {
  return { type: STOP_REFRESH };
};

export const updateVersionServerAction = payload => {
  return { type: UPDATE, payload };
};

export const editVersionServerAction = payload => {
  return { type: EDIT, payload };
};

export const createVersionServerAction = payload => {
  return { type: CREATE, payload };
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
  const { name, environment, replicas, version } = payload;
  const body = {
    apiVersion: `${SOLUTION_API_GROUP}/v1alpha1`,
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
    `${environment}-${SOLUTION_NAME}`
  );
  if (!result.error) {
    yield call(fetchVersionServer, `${environment}-${SOLUTION_NAME}`);
    yield call(history.push, `/environments/${environment}`);
  }
}

export function* editVersionServer({ payload }) {
  const { name, environment, replicas, version } = payload;
  const body = {
    apiVersion: `${SOLUTION_API_GROUP}/v1alpha1`,
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
    `${environment}-${SOLUTION_NAME}`,
    name
  );

  if (!result.error) {
    yield call(fetchVersionServer, `${environment}-${SOLUTION_NAME}`);
    yield call(history.push, `/environments/${environment}`);
  }
}

export function* refreshVersionServer({ environment }) {
  yield put(
    updateVersionServerAction({
      isRefreshing: true
    })
  );
  const results = yield call(
    fetchVersionServer,
    `${environment}-${SOLUTION_NAME}`
  );
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.versionServer.isRefreshing
    );
    if (isRefreshing) {
      yield call(refreshVersionServer, { environment });
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
  yield takeEvery(REFRESH, refreshVersionServer);
  yield takeEvery(STOP_REFRESH, stopRefreshVersionServer);
  yield takeEvery(CREATE, createVersionServer);
  yield takeEvery(EDIT, editVersionServer);
}
