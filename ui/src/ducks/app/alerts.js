//@flow
import {
  Effect,
  takeEvery,
  takeLatest,
  call,
  put,
  delay,
  select,
} from 'redux-saga/effects';
import * as ApiAlertmanager from '../../services/alertmanager/api';
import type { RootState } from '../reducer';
import type { Result } from '../../types';
import { REFRESH_TIMEOUT } from '../../constants';
import { removeWarningAlerts } from '../../services/alertUtils';
// Actions
const FETCH_ALERTS_ALERTMANAGER = 'FETCH_ALERTS_ALERTMANAGER';
const UPDATE_ALERTS_ALERTMANAGER = 'UPDATE_ALERTS_ALERTMANAGER';
const REFRESH_ALERTS_ALERTMANAGER = 'REFRESH_ALERTS_ALERTMANAGER';
const STOP_REFRESH_ALERTS_ALERTMANAGER = 'STOP_REFRESH_ALERTS_ALERTMANAGER';

// Selectors
export const isAlertManagerRefreshing = (state: RootState) =>
  state.app.alerts.isRefreshing;

// Reducer
const defaultState = {
  isRefreshing: false,
  list: [],
};

export type AlertsState = {
  isRefreshing: boolean,
  list: ApiAlertmanager.PrometheusAlert[],
};

export default function reducer(
  state: AlertsState = defaultState,
  action: any = {},
) {
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

export const updateAlertsAlertmanagerAction = (
  payload: $Shape<AlertsState>,
) => {
  return { type: UPDATE_ALERTS_ALERTMANAGER, payload };
};

export const refreshAlertManagerAction = () => {
  return { type: REFRESH_ALERTS_ALERTMANAGER };
};

export const stopRefreshAlertManagerAction = () => {
  return { type: STOP_REFRESH_ALERTS_ALERTMANAGER };
};

// Sagas
export function* fetchAlertsAlertmanager(): Generator<
  Effect,
  Result<ApiAlertmanager.PrometheusAlert[]>,
  Result<ApiAlertmanager.PrometheusAlert[]>,
> {
  const result = yield call(ApiAlertmanager.getAlerts);

  if (!result.error) {
    yield put(
      updateAlertsAlertmanagerAction({ list: removeWarningAlerts(result) }),
    );
  }
  return result;
}

export function* refreshAlertsAlertmanager(): Generator<
  Effect,
  void,
  Result<ApiAlertmanager.PrometheusAlert[]>,
> {
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

export function* stopRefreshAlertsAlertmanager(): Generator<
  Effect,
  void,
  void,
> {
  yield put(updateAlertsAlertmanagerAction({ isRefreshing: false }));
}

export function* alertsSaga(): Generator<Effect, void, void> {
  yield takeLatest(FETCH_ALERTS_ALERTMANAGER, fetchAlertsAlertmanager);
  yield takeEvery(REFRESH_ALERTS_ALERTMANAGER, refreshAlertsAlertmanager);
  yield takeEvery(
    STOP_REFRESH_ALERTS_ALERTMANAGER,
    stopRefreshAlertsAlertmanager,
  );
}
