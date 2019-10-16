import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';

import {
  REFRESH_TIMEOUT,
  SOLUTION_NAME,
  SOLUTION_API_GROUP
} from '../../constants';

// Actions
const REFRESH = 'REFRESH_CLOCK_SERVER';
const STOP_REFRESH = 'STOP_REFRESH_CLOCK_SERVER';
const CREATE = 'CREATE_CLOCK_SERVER';

const UPDATE = 'UPDATE_CLOCK_SERVER';
const EDIT = 'EDIT_CLOCK_SERVER';

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
export const refreshClockServerAction = environment => {
  return { type: REFRESH, environment };
};

export const stopRefreshClockServerAction = () => {
  return { type: STOP_REFRESH };
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
export function* fetchClockServer(namespaces) {
  const results = yield call(ApiK8s.getClockServer, namespaces);
  if (!results.error) {
    yield put(
      updateClockServerAction({
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
    apiVersion: `${SOLUTION_API_GROUP}/v1alpha1`,
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
    yield call(fetchClockServer, `${environment}-${SOLUTION_NAME}`);
    yield call(history.push, `/environments/${environment}`);
  }
}

export function* editClockServer({ payload }) {
  const { name, environment, timezone, version } = payload;
  const body = {
    apiVersion: `${SOLUTION_API_GROUP}/v1alpha1`,
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
    yield call(fetchClockServer, `${environment}-${SOLUTION_NAME}`);
    yield call(history.push, `/environments/${environment}`);
  }
}

export function* refreshClockServer({ environment }) {
  yield put(
    updateClockServerAction({
      isRefreshing: true
    })
  );
  const results = yield call(
    fetchClockServer,
    `${environment}-${SOLUTION_NAME}`
  );
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.clockServer.isRefreshing
    );
    if (isRefreshing) {
      yield call(refreshClockServer, { environment });
    }
  }
}

export function* stopRefreshClockServer() {
  yield put(
    updateClockServerAction({
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
