import { put, takeEvery, select, call } from 'redux-saga/effects';
import { getAlerts, getClusterStatus } from '../../services/prometheus/api';

const FETCH_ALERTS = 'FETCH_ALERTS';
const SET_ALERTS = 'SET_ALERTS';

const FETCH_CLUSTER_STATUS = 'FETCH_CLUSTER_STATUS';
const SET_CLUSTER_STATUS = 'SET_CLUSTER_STATUS';

const defaultState = {
  alertList: [],
  clusterStatus: []
};

export default function(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_ALERTS:
      return { ...state, alertList: action.payload };
    case SET_CLUSTER_STATUS:
      return { ...state, clusterStatus: action.payload };
    default:
      return state;
  }
}

export const fetchAlertsAction = () => {
  return { type: FETCH_ALERTS };
};

export const setAlertsAction = payload => {
  return { type: SET_ALERTS, payload };
};

export const fetchClusterStatusAction = () => {
  return { type: FETCH_CLUSTER_STATUS };
};

export const setClusterStatusAction = payload => {
  return { type: SET_CLUSTER_STATUS, payload };
};

export function* fetchAlerts() {
  const api = yield select(state => state.config.api);
  const result = yield call(getAlerts, api.url_prometheus);
  if (!result.error) {
    yield put(setAlertsAction(result.data.data.alerts));
  }
}

export function* fetchClusterStatus() {
  const api = yield select(state => state.config.api);
  const result = yield call(getClusterStatus, api.url_prometheus);
  if (!result.error) {
    yield put(setClusterStatusAction(result.data.data.result));
  }
}

export function* monitoringSaga() {
  yield takeEvery(FETCH_ALERTS, fetchAlerts);
  yield takeEvery(FETCH_CLUSTER_STATUS, fetchClusterStatus);
}
