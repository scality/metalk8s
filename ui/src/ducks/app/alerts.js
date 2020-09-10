import { takeEvery, call, put } from 'redux-saga/effects';
import * as ApiAlertmanager from '../../services/alertmanager/api';

// Actions
const FETCH_ALERTS_ALERTMANAGER = 'FETCH_ALERTS_ALERTMANAGER';
const UPDATE_ALERTS_ALERTMANAGER = 'UPDATE_ALERTS_ALERTMANAGER';

// Reducer
const defaultState = {
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

// Sagas
export function* fetchAlertsAlertmanager() {
  const result = yield call(ApiAlertmanager.getAlerts);

  if (!result.error) {
    yield put(updateAlertsAlertmanagerAction({ list: result }));
  }
}

export function* alertsSaga() {
  yield takeEvery(FETCH_ALERTS_ALERTMANAGER, fetchAlertsAlertmanager);
}
