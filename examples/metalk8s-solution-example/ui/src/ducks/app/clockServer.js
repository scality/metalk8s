import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';

import { REFRESH_TIMEOUT } from '../../constants';

// Actions
const REFRESH_CLOCK_SERVER = 'REFRESH_CLOCK_SERVER';
const STOP_REFRESH_CLOCK_SERVER = 'STOP_REFRESH_CLOCK_SERVER';
const CREATE_CLOCK_SERVER = 'CREATE_CLOCK_SERVER';

const UPDATE_CLOCK_SERVER = 'UPDATE_CLOCK_SERVER';
const EDIT_CLOCK_SERVER = 'EDIT_CLOCK_SERVER';

// Reducer
const defaultState = {
  list: [],
  isRefreshing: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE_CLOCK_SERVER:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Action Creators
export const refreshClockServerAction = stack => {
  return { type: REFRESH_CLOCK_SERVER, stack };
};

export const stopRefreshClockServerAction = () => {
  return { type: STOP_REFRESH_CLOCK_SERVER };
};

export const updateClockServerAction = payload => {
  return { type: UPDATE_CLOCK_SERVER, payload };
};

export const editClockServerAction = payload => {
  return { type: EDIT_CLOCK_SERVER, payload };
};

export const createClockServerAction = payload => {
  return { type: CREATE_CLOCK_SERVER, payload };
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
  const { name, stack, timezone, version } = payload;
  const body = {
    apiVersion: 'example-solution.metalk8s.scality.com/v1alpha1',
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
    `${stack}-example-solution`
  );
  if (!result.error) {
    yield call(fetchClockServer, `${stack}-example-solution`);
    yield call(history.push, `/stacks/${stack}`);
  }
}

export function* editClockServer({ payload }) {
  const { name, stack, timezone, version } = payload;
  const body = {
    apiVersion: 'example-solution.metalk8s.scality.com/v1alpha1',
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
    `${stack}-example-solution`,
    name
  );

  if (!result.error) {
    yield call(fetchClockServer, `${stack}-example-solution`);
    yield call(history.push, `/stacks/${stack}`);
  }
}

export function* refreshClockServer({ stack }) {
  yield put(
    updateClockServerAction({
      isRefreshing: true
    })
  );
  const results = yield call(fetchClockServer, `${stack}-example-solution`);
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.clockServer.isRefreshing
    );
    if (isRefreshing) {
      yield call(refreshClockServer, { stack });
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
  yield takeEvery(REFRESH_CLOCK_SERVER, refreshClockServer);
  yield takeEvery(STOP_REFRESH_CLOCK_SERVER, stopRefreshClockServer);
  yield takeEvery(CREATE_CLOCK_SERVER, createClockServer);
  yield takeEvery(EDIT_CLOCK_SERVER, editClockServer);
}
