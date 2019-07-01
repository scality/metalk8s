import { put, takeEvery, call, all } from 'redux-saga/effects';
import { getAlerts, queryPrometheus } from '../../services/prometheus/api';

export const SET_ALERTS = 'SET_ALERTS';

const FETCH_CLUSTER_STATUS = 'FETCH_CLUSTER_STATUS';
export const SET_CLUSTER_STATUS = 'SET_CLUSTER_STATUS';

export const CLUSTER_STATUS_UP = 'CLUSTER_STATUS_UP';
export const CLUSTER_STATUS_DOWN = 'CLUSTER_STATUS_DOWN';
const CLUSTER_STATUS_ERROR = 'CLUSTER_STATUS_ERROR';

const defaultState = {
  alertList: [],
  cluster: {
    apiServerStatus: 0,
    kubeSchedulerStatus: 0,
    kubeControllerManagerStatus: 0,
    error: null
  }
};

export default function(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_ALERTS:
      return { ...state, alertList: action.payload };

    case SET_CLUSTER_STATUS:
      return {
        ...state,
        cluster: action.payload
      };
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

  const resultAlerts = yield call(getAlerts); // Check if Prometheus API is available

  if (!resultAlerts.error) {
    yield put(setAlertsAction(resultAlerts.data.alerts));

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
      clusterHealth.error = null;
    } else {
      parseClusterQueryError(clusterHealth, errorResult);
    }
  } else {
    parseClusterQueryError(clusterHealth, resultAlerts);
  }
  yield put(setClusterStatusAction(clusterHealth));
}

export function* monitoringSaga() {
  yield takeEvery(FETCH_CLUSTER_STATUS, fetchClusterStatus);
}
