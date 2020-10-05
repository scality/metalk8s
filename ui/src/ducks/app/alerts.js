import { takeEvery, takeLatest, call, put, delay, select } from 'redux-saga/effects';
import * as ApiAlertmanager from '../../services/alertmanager/api';

import {
  REFRESH_TIMEOUT,
} from '../../constants';

// Actions
const FETCH_ALERTS_ALERTMANAGER = 'FETCH_ALERTS_ALERTMANAGER';
const UPDATE_ALERTS_ALERTMANAGER = 'UPDATE_ALERTS_ALERTMANAGER';
const REFRESH_ALERTS_ALERTMANAGER = 'REFRESH_ALERTS_ALERTMANAGER';
const STOP_REFRESH_ALERTS_ALERTMANAGER = 'STOP_REFRESH_ALERTS_ALERTMANAGER';

// Selectors
export const isAlertManagerRefreshing = (state) =>
  state.app.alerts.isRefreshing;

// Reducer
const defaultState = {
  isRefreshing: false,
  list: [],
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE_ALERTS_ALERTMANAGER:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Action Creators
export const fetchAlertsAlertmanagerAction = () => {
  return { type: FETCH_ALERTS_ALERTMANAGER };
};

export const updateAlertsAlertmanagerAction = (payload) => {
  return { type: UPDATE_ALERTS_ALERTMANAGER, payload };
};

export const refreshAlertManagerAction = () => {
  return { type: REFRESH_ALERTS_ALERTMANAGER };
};

export const stopRefreshAlertManagerAction = () => {
  return { type: STOP_REFRESH_ALERTS_ALERTMANAGER };
};


// Sagas
export function* fetchAlertsAlertmanager() {
  const result = yield call(ApiAlertmanager.getAlerts);

  if (!result.error) {
    yield put(updateAlertsAlertmanagerAction({ list: result }));
  }
  return result;
}

export function* refreshAlertsAlertmanager() {
  yield put(updateAlertsAlertmanagerAction({ isRefreshing: true }));
  const result = yield call(fetchAlertsAlertmanager);
  if (!result.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(isAlertManagerRefreshing);
    if (isRefreshing) {
      yield call(refreshAlertsAlertmanager);
    }
  }
}

export function* stopRefreshAlertsAlertmanager() {
  yield put(updateAlertsAlertmanagerAction({ isRefreshing: false }));
}


export function* alertsSaga() {
  yield takeLatest(FETCH_ALERTS_ALERTMANAGER, fetchAlertsAlertmanager);
  yield takeEvery(REFRESH_ALERTS_ALERTMANAGER, refreshAlertsAlertmanager);
  yield takeEvery(STOP_REFRESH_ALERTS_ALERTMANAGER, stopRefreshAlertsAlertmanager);
}
