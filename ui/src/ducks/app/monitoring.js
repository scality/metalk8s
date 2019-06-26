import { put, takeEvery, call } from 'redux-saga/effects';
import { getAlerts, getClusterStatus } from '../../services/prometheus/api';
import { intl } from '../../translations/IntlGlobalProvider';

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

export const setAlertsAction = payload => {
  return { type: SET_ALERTS, payload };
};

export const fetchClusterStatusAction = () => {
  return { type: FETCH_CLUSTER_STATUS };
};

export const setClusterStatusAction = payload => {
  return { type: SET_CLUSTER_STATUS, payload };
};

export function* fetchClusterStatus() {
  const clusterHealth = {
    status: '',
    label: ''
  };
  const resultAlerts = yield call(getAlerts); // Check if Prometheus API is available

  if (!resultAlerts.error) {
    yield put(setAlertsAction(resultAlerts.data.alerts));

    const result = yield call(getClusterStatus);

    if (!result.error) {
      if (result.data.result && result.data.result.length) {
        clusterHealth.status = CLUSTER_STATUS_UP;
        clusterHealth.statusLabel = intl.translate('cluster_up_and_running');
      } else {
        clusterHealth.status = CLUSTER_STATUS_DOWN;
        clusterHealth.statusLabel = intl.translate('down');
      }
    }
  } else {
    clusterHealth.status = CLUSTER_STATUS_ERROR;
    if (resultAlerts.error.response) {
      clusterHealth.statusLabel = `Prometheus - ${
        resultAlerts.error.response.statusText
      }`;
    } else {
      clusterHealth.statusLabel = intl.translate('prometheus_unavailable');
    }
  }
  yield put(setClusterStatusAction(clusterHealth));
}

export function* monitoringSaga() {
  yield takeEvery(FETCH_CLUSTER_STATUS, fetchClusterStatus);
}
