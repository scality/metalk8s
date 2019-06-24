import { put, takeEvery, call } from 'redux-saga/effects';
import { getAlerts, getClusterStatus } from '../../services/prometheus/api';
import { intl } from '../../translations/IntlGlobalProvider';

const FETCH_ALERTS = 'FETCH_ALERTS';
const SET_ALERTS = 'SET_ALERTS';

const FETCH_CLUSTER_STATUS = 'FETCH_CLUSTER_STATUS';
const SET_CLUSTER_STATUS = 'SET_CLUSTER_STATUS';

export const CLUSTER_STATUS_UP = 'CLUSTER_STATUS_UP';
const CLUSTER_STATUS_DOWN = 'CLUSTER_STATUS_DOWN';
const CLUSTER_STATUS_ERROR = 'CLUSTER_STATUS_ERROR';

const defaultState = {
  alertList: [],
  cluster: {
    status: '',
    statusLabel: ''
  }
};

export default function(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_ALERTS:
      return { ...state, alertList: action.payload };
    case SET_CLUSTER_STATUS:
      return { ...state, cluster: action.payload };
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
  const result = yield call(getAlerts);
  if (!result.error) {
    yield put(setAlertsAction(result.data.alerts));
  }
}

export function* fetchClusterStatus() {
  const result = yield call(getClusterStatus);
  const clusterHealth = {
    status: '',
    label: ''
  };
  if (!result.error) {
    if (result.data.result && result.data.result.length) {
      clusterHealth.status = CLUSTER_STATUS_UP;
      clusterHealth.statusLabel = intl.translate('cluster_up_and_running');
    } else {
      clusterHealth.status = CLUSTER_STATUS_DOWN;
      clusterHealth.statusLabel = intl.translate('down');
    }
  } else {
    clusterHealth.status = CLUSTER_STATUS_ERROR;
    if (result.error.response) {
      clusterHealth.statusLabel = `Prometheus - ${
        result.error.response.statusText
      }`;
    } else {
      clusterHealth.statusLabel = intl.translate(
        'prometheus_connection_failed'
      );
    }
  }
  yield put(setClusterStatusAction(clusterHealth));
}

export function* monitoringSaga() {
  yield takeEvery(FETCH_ALERTS, fetchAlerts);
  yield takeEvery(FETCH_CLUSTER_STATUS, fetchClusterStatus);
}
