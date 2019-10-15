import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';

import {
  REFRESH_TIMEOUT,
  SOLUTION_NAME,
  SOLUTION_GROUP
} from '../../constants';

// Actions
const REFRESH = 'REFRESH_CLOCK_SERVER';
const STOP_REFRESH = 'STOP_REFRESH_CLOCK_SERVER';
const CREATE = 'CREATE_CLOCK_SERVER';
export const UPDATE = 'UPDATE_CLOCK_SERVER';
const EDIT = 'EDIT_CLOCK_SERVER';

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
        environments[index].clockServer = environments[index].clockServer
          ? { ...environments[index].clockServer, ...action.payload }
          : action.payload;
        return { ...state, list: [...environments] };
      }
      return state;
    default:
      return state;
  }
}

// Action Creators
export const refreshClockServerAction = environment => {
  return { type: REFRESH, environment };
};

export const stopRefreshClockServerAction = environment => {
  return { type: STOP_REFRESH, environment };
};

export const updateClockServerAction = payload => {
  return { type: UPDATE, payload };
};

export const editClockServerAction = payload => {
  return { type: EDIT, payload };
};

export const createClockServerAction = payload => {
  return { type: CREATE, payload };
};

// Sagas
export function* fetchClockServer(environment) {
  const results = yield call(
    ApiK8s.getClockServer,
    `${environment}-${SOLUTION_NAME}`
  );
  if (!results.error) {
    yield put(
      updateClockServerAction({
        environment,
        list: results.body.items.map(cr => {
          return {
            name: cr.metadata.name,
            timezone: cr.spec.timezone,
            version: cr.spec.version,
            kind: results.body.kind
          };
        })
      })
    );
  }
  return results;
}

export function* createClockServer({ payload }) {
  const { name, environment, timezone, version } = payload;
  const body = {
    apiVersion: `${SOLUTION_GROUP}/v1alpha1`,
    kind: 'ClockServer',
    metadata: {
      name
    },
    spec: {
      timezone,
      version
    }
  };

  const result = yield call(
    ApiK8s.createClockServer,
    body,
    `${environment}-${SOLUTION_NAME}`
  );
  if (!result.error) {
    yield call(fetchClockServer, environment);
    yield call(history.push, `/environments/${environment}`);
  }
}

export function* editClockServer({ payload }) {
  const { name, environment, timezone, version } = payload;
  const body = {
    apiVersion: `${SOLUTION_GROUP}/v1alpha1`,
    kind: 'ClockServer',
    metadata: {
      name
    },
    spec: {
      timezone,
      version
    }
  };

  const result = yield call(
    ApiK8s.updateClockServer,
    body,
    `${environment}-${SOLUTION_NAME}`,
    name
  );

  if (!result.error) {
    yield call(fetchClockServer, environment);
    yield call(history.push, `/environments/${environment}`);
  }
}

export function* refreshClockServer({ environment }) {
  yield put(
    updateClockServerAction({
      environment,
      isRefreshing: true
    })
  );
  const results = yield call(fetchClockServer, environment);
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const environments = yield select(state => state.app.environment.list);
    if (
      environments.find(env => env.name === environment).clockServer
        .isRefreshing
    ) {
      yield call(refreshClockServer, { environment });
    }
  }
}

export function* stopRefreshClockServer({ environment }) {
  yield put(
    updateClockServerAction({
      environment,
      isRefreshing: false
    })
  );
}

export function* clockServerSaga() {
  yield takeEvery(REFRESH, refreshClockServer);
  yield takeEvery(STOP_REFRESH, stopRefreshClockServer);
  yield takeEvery(CREATE, createClockServer);
  yield takeEvery(EDIT, editClockServer);
}
