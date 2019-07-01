import { put, takeEvery, call, all } from 'redux-saga/effects';
import { getAlerts, queryPrometheus } from '../../services/prometheus/api';

const FETCH_CLUSTER_STATUS = 'FETCH_CLUSTER_STATUS';
export const SET_CLUSTER_STATUS = 'SET_CLUSTER_STATUS';

const FETCH_ALERTS = 'FETCH_ALERTS';
export const SET_ALERTS = 'SET_ALERTS';

export const CLUSTER_STATUS_UP = 'CLUSTER_STATUS_UP';
export const CLUSTER_STATUS_DOWN = 'CLUSTER_STATUS_DOWN';
const CLUSTER_STATUS_ERROR = 'CLUSTER_STATUS_ERROR';

const SET_PROMETHEUS_API_AVAILABLE = 'SET_PROMETHEUS_API_AVAILABLE';

const defaultState = {
  alert: {
    list: [],
    error: null
  },
  cluster: {
    apiServerStatus: 0,
    kubeSchedulerStatus: 0,
    kubeControllerManagerStatus: 0,
    error: null
  },
  isPrometheusApiUp: false
};

export default function(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_PROMETHEUS_API_AVAILABLE:
      return { ...state, isPrometheusApiUp: action.payload };
    case SET_ALERTS:
      return { ...state, alert: action.payload };
    case SET_CLUSTER_STATUS:
      return {
        ...state,
        cluster: action.payload
      };
    default:
      return state;
  }
}

export const fetchClusterStatusAction = () => {
  return { type: FETCH_CLUSTER_STATUS };
};

export const setClusterStatusAction = payload => {
  return { type: SET_CLUSTER_STATUS, payload };
};

const setPrometheusApiAvailable = payload => {
  return { type: SET_PROMETHEUS_API_AVAILABLE, payload };
};

function getClusterQueryStatus(result) {
  return result &&
    result.status === 'success' &&
    result.data.result[0].value.length
    ? parseInt(result.data.result[0].value[1])
    : 0;
}

function parseClusterQueryError(clusterHealth, result) {
  clusterHealth.status = CLUSTER_STATUS_ERROR;
  if (result.error.response) {
    clusterHealth.error = `Prometheus - ${result.error.response.statusText}`;
  } else {
    clusterHealth.error = 'prometheus_unavailable';
  }
}

export const fetchAlertsAction = () => {
  return { type: FETCH_ALERTS };
};

export const setAlertsAction = payload => {
  return { type: SET_ALERTS, payload };
};

export function* fetchClusterStatus() {
  const clusterHealth = {
    apiServerStatus: 0,
    kubeSchedulerStatus: 0,
    kubeControllerManagerStatus: 0,
    error: null
  };

  const apiserverQuery = 'sum(up{job="apiserver"})';
  const kubeSchedulerQuery = 'sum(up{job="kube-scheduler"})';
  const kubeControllerManagerQuery = 'sum(up{job="kube-controller-manager"})';

  const results = yield all([
    call(queryPrometheus, apiserverQuery),
    call(queryPrometheus, kubeSchedulerQuery),
    call(queryPrometheus, kubeControllerManagerQuery)
  ]);

  const errorResult = results.find(result => result.error);

  if (!errorResult) {
    clusterHealth.apiServerStatus = getClusterQueryStatus(results[0]);
    clusterHealth.kubeSchedulerStatus = getClusterQueryStatus(results[1]);
    clusterHealth.kubeControllerManagerStatus = getClusterQueryStatus(
      results[2]
    );
    yield put(setPrometheusApiAvailable(true));
  } else {
    // API is not responding
    yield put(setPrometheusApiAvailable(false));
    parseClusterQueryError(clusterHealth, errorResult);
  }

  yield put(setClusterStatusAction(clusterHealth));
}

export function* fetchAlerts() {
  const resultAlerts = yield call(getAlerts); // Check if Prometheus API is available
  let alert = {
    list: [],
    error: null
  };

  if (!resultAlerts.error) {
    yield put(setPrometheusApiAvailable(true));
    alert.list = resultAlerts.data.alerts;
  } else {
    if (resultAlerts.error.response) {
      alert.error = resultAlerts.error.response.statusText;
    } else {
      // API is not responding
      yield put(setPrometheusApiAvailable(false));
      alert.error = 'prometheus_unavailable';
    }
  }
  yield put(setAlertsAction(alert));
}

export function* monitoringSaga() {
  yield takeEvery(FETCH_CLUSTER_STATUS, fetchClusterStatus);
  yield takeEvery(FETCH_ALERTS, fetchAlerts);
}
