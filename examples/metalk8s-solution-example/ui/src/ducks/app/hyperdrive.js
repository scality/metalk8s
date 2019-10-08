import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';

import { REFRESH_TIMEOUT } from '../../constants';

// Actions

const REFRESH_HYPERDRIVE = 'REFRESH_HYPERDRIVE';
const STOP_REFRESH_HYPERDRIVE = 'STOP_REFRESH_HYPERDRIVE';
const UPDATE_HYPERDRIVE = 'UPDATE_HYPERDRIVE';

// Reducer

const defaultState = {
  list: [],
  isRefreshingHyperdrive: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    default:
      return state;
  }
}

// Action Creators

export const refreshHyperdriveAction = environment => {
  return { type: REFRESH_HYPERDRIVE, environment };
};

export const stopRefreshHyperdriveAction = () => {
  return { type: STOP_REFRESH_HYPERDRIVE };
};

export const updateHyperdriveAction = payload => {
  return { type: UPDATE_HYPERDRIVE, payload };
};

// Sagas

export function* fetchHyperdrive(namespaces) {
  const results = yield call(ApiK8s.getHyperdrives, namespaces);
  if (!results.error) {
    // yield put(
    //   updateClockServerAction({
    //     list: results.body.items.map(cr => {
    //       return {
    //         name: cr.metadata.name,
    //         timezone: cr.spec.timezone,
    //         version: cr.spec.version,
    //         kind: results.body.kind
    //       };
    //     })
    //   })
    // );
  }
  return results;
}

export function* refreshHyperdrive({ environment }) {
  yield put(
    updateHyperdriveAction({
      isRefreshingHyperdrive: true
    })
  );

  const results = yield call(
    fetchHyperdrive,
    `${environment}-example-solution`
  );

  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.Hyperdrive.isRefreshingHyperdrive
    );
    if (isRefreshing) {
      yield call(refreshHyperdrive, { environment });
    }
  }
}

export function* stopRefreshHyperdrive() {
  yield put(
    updateHyperdriveAction({
      isRefreshingHyperdrive: false
    })
  );
}

export function* HyperdriveSaga() {
  yield takeEvery(REFRESH_HYPERDRIVE, refreshHyperdrive);
  yield takeEvery(STOP_REFRESH_HYPERDRIVE, stopRefreshHyperdrive);
}
