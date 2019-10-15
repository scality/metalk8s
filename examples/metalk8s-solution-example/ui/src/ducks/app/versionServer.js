import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
import {
  REFRESH_TIMEOUT,
  SOLUTION_NAME,
  SOLUTION_GROUP
} from '../../constants';

// Actions
const REFRESH = 'REFRESH_VERSION_SERVER';
const STOP_REFRESH = 'STOP_REFRESH_VERSION_SERVER';
const CREATE = 'CREATE_VERSION_SERVER';

export const UPDATE = 'UPDATE_VERSION_SERVER';
const EDIT = 'EDIT_VERSION_SERVER';

// Reducer
const defaultState = {
  list: [],
  isRefreshing: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE:
      const environments = [...state.list];
      const index = environments.findIndex(
        item => item.name === action.payload.environment
      );
      if (index > -1) {
        environments[index].versionServer = environments[index].versionServer
          ? { ...environments[index].versionServer, ...action.payload }
          : action.payload;
        return { ...state, list: [...environments] };
      }
      return state;
    default:
      return state;
  }
}

// Action Creators
export const refreshVersionServerAction = environment => {
  return { type: REFRESH, environment };
};

export const stopRefreshVersionServerAction = environment => {
  return { type: STOP_REFRESH, environment };
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
export function* fetchVersionServer(environment) {
  const results = yield call(
    ApiK8s.getVersionServer,
    `${environment}-${SOLUTION_NAME}`
  );
  if (!results.error) {
    yield put(
      updateVersionServerAction({
        environment,
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
    apiVersion: `${SOLUTION_GROUP}/v1alpha1`,
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
    yield call(fetchVersionServer, environment);
    yield call(history.push, `/environments/${environment}`);
  }
}

export function* editVersionServer({ payload }) {
  const { name, environment, replicas, version } = payload;
  const body = {
    apiVersion: `${SOLUTION_GROUP}/v1alpha1`,
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
    yield call(fetchVersionServer, environment);
    yield call(history.push, `/environments/${environment}`);
  }
}

export function* refreshVersionServer({ environment }) {
  yield put(
    updateVersionServerAction({
      environment,
      isRefreshing: true
    })
  );
  const results = yield call(fetchVersionServer, environment);
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const environments = yield select(state => state.app.environment.list);
    if (
      environments.find(env => env.name === environment).versionServer
        .isRefreshing
    ) {
      yield call(refreshVersionServer, { environment });
    }
  }
}

export function* stopRefreshVersionServer({ environment }) {
  yield put(
    updateVersionServerAction({
      environment,
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
