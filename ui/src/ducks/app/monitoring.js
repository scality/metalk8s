import { put, takeEvery, call, all, delay, select } from 'redux-saga/effects';
import { getAlerts, queryPrometheus } from '../../services/prometheus/api';
import { REFRESH_TIMEOUT } from '../../constants';
import * as ApiK8s from '../../services/k8s/api';

const REFRESH_CLUSTER_STATUS = 'REFRESH_CLUSTER_STATUS';
const STOP_REFRESH_CLUSTER_STATUS = 'STOP_REFRESH_CLUSTER_STATUS';
export const UPDATE_CLUSTER_STATUS = 'UPDATE_CLUSTER_STATUS';

const REFRESH_ALERTS = 'REFRESH_ALERTS';
const STOP_REFRESH_ALERTS = 'STOP_REFRESH_ALERTS';
export const UPDATE_ALERTS = 'UPDATE_ALERTS';

export const CLUSTER_STATUS_UP = 'CLUSTER_STATUS_UP';
export const CLUSTER_STATUS_DOWN = 'CLUSTER_STATUS_DOWN';
export const CLUSTER_STATUS_UNKNOWN = 'CLUSTER_STATUS_UNKNOWN ';

export const SET_PROMETHEUS_API_AVAILABLE = 'SET_PROMETHEUS_API_AVAILABLE';

// Reducer
const defaultState = {
  alert: {
    list: [],
    error: null,
    isLoading: false,
    isRefreshing: false,
  },
  cluster: {
    apiServerStatus: 0,
    kubeSchedulerStatus: 0,
    kubeControllerManagerStatus: 0,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isPrometheusVolumeProvisioned: true,
  },
  isPrometheusApiUp: false,
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_PROMETHEUS_API_AVAILABLE:
      return { ...state, isPrometheusApiUp: action.payload };
    case UPDATE_ALERTS:
      return { ...state, alert: { ...state.alert, ...action.payload } };
    case UPDATE_CLUSTER_STATUS:
      return {
        ...state,
        cluster: { ...state.cluster, ...action.payload },
      };
    default:
      return state;
  }
}

// Action Creators
export const refreshClusterStatusAction = () => {
  return { type: REFRESH_CLUSTER_STATUS };
};

export const stopRefreshClusterStatusAction = () => {
  return { type: STOP_REFRESH_CLUSTER_STATUS };
};

export const updateClusterStatusAction = payload => {
  return { type: UPDATE_CLUSTER_STATUS, payload };
};

const setPrometheusApiAvailable = payload => {
  return { type: SET_PROMETHEUS_API_AVAILABLE, payload };
};

export const refreshAlertsAction = () => {
  return { type: REFRESH_ALERTS };
};

export const stopRefreshAlertsAction = () => {
  return { type: STOP_REFRESH_ALERTS };
};

export const updateAlertsAction = payload => {
  return { type: UPDATE_ALERTS, payload };
};

// Selectors
export const isAlertRefreshing = state =>
  state.app.monitoring.alert.isRefreshing;
export const isClusterRefreshing = state =>
  state.app.monitoring.cluster.isRefreshing;

// Sagas
function getClusterQueryStatus(result) {
  return result &&
    result.status === 'success' &&
    result.data.result.length &&
    result.data.result[0].value.length
    ? parseInt(result.data.result[0].value[1])
    : 0;
}

export function* handlePrometheusError(clusterHealth, result) {
  if (result.error.response) {
    yield put(setPrometheusApiAvailable(true));
    clusterHealth.error = `Prometheus - ${result.error.response.statusText}`;
  } else {
    const prometheusPod = yield call(
      ApiK8s.queryPodInNamespace,
      'metalk8s-monitoring',
      'prometheus',
    );
    if (!prometheusPod.error) {
      const conditions = prometheusPod?.body?.items[0]?.status?.conditions;
      const scheduledCondition = conditions?.find(
        c => c.type === 'PodScheduled',
      );
      if (
        scheduledCondition?.message?.includes(
          `didn't find available persistent volumes to bind`,
        )
      ) {
        clusterHealth.isPrometheusVolumeProvisioned = false;
      }
    }
    yield put(setPrometheusApiAvailable(false));
    clusterHealth.error = 'prometheus_unavailable';
  }
}

export function* fetchClusterStatus() {
  yield put(updateClusterStatusAction({ isLoading: true }));
  const clusterHealth = {
    apiServerStatus: 0,
    kubeSchedulerStatus: 0,
    kubeControllerManagerStatus: 0,
    error: null,
    isPrometheusVolumeProvisioned: true,
  };

  const apiserverQuery = 'sum(up{job="apiserver"})';
  const kubeSchedulerQuery = 'sum(up{job="kube-scheduler"})';
  const kubeControllerManagerQuery = 'sum(up{job="kube-controller-manager"})';

  const results = yield all([
    call(queryPrometheus, apiserverQuery),
    call(queryPrometheus, kubeSchedulerQuery),
    call(queryPrometheus, kubeControllerManagerQuery),
  ]);

  const errorResult = results.find(result => result.error);

  if (!errorResult) {
    clusterHealth.apiServerStatus = getClusterQueryStatus(results[0]);
    clusterHealth.kubeSchedulerStatus = getClusterQueryStatus(results[1]);
    clusterHealth.kubeControllerManagerStatus = getClusterQueryStatus(
      results[2],
    );
    yield put(setPrometheusApiAvailable(true));
  } else {
    yield call(handlePrometheusError, clusterHealth, errorResult);
  }
  yield put(updateClusterStatusAction(clusterHealth));
  yield delay(1000); // To make sure that the loader is visible for at least 1s
  yield put(updateClusterStatusAction({ isLoading: false }));
  return errorResult;
}

export function* fetchAlerts() {
  yield put(updateAlertsAction({ isLoading: true }));
  const resultAlerts = yield call(getAlerts);
  let alert = {
    list: [],
    error: null,
  };

  if (!resultAlerts.error) {
    yield put(setPrometheusApiAvailable(true));
    alert.list = resultAlerts.data.alerts;
  } else {
    yield call(handlePrometheusError, alert, resultAlerts);
  }
  yield put(updateAlertsAction(alert));
  yield delay(1000); // To make sure that the loader is visible for at least 1s
  yield put(updateAlertsAction({ isLoading: false }));
  return resultAlerts;
}

export function* refreshAlerts() {
  yield put(updateAlertsAction({ isRefreshing: true }));
  const resultAlerts = yield call(fetchAlerts);
  if (!resultAlerts.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(isClusterRefreshing);
    if (isRefreshing) {
      yield call(refreshAlerts);
    }
  }
}

export function* stopRefreshAlerts() {
  yield put(updateAlertsAction({ isRefreshing: false }));
}

export function* refreshClusterStatus() {
  yield put(updateClusterStatusAction({ isRefreshing: true }));
  const errorResult = yield call(fetchClusterStatus);
  if (!errorResult) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(isClusterRefreshing);
    if (isRefreshing) {
      yield call(refreshClusterStatus);
    }
  }
}

export function* stopRefreshClusterStatus() {
  yield put(updateClusterStatusAction({ isRefreshing: false }));
}

export function* monitoringSaga() {
  yield takeEvery(REFRESH_CLUSTER_STATUS, refreshClusterStatus);
  yield takeEvery(REFRESH_ALERTS, refreshAlerts);
  yield takeEvery(STOP_REFRESH_ALERTS, stopRefreshAlerts);
  yield takeEvery(STOP_REFRESH_CLUSTER_STATUS, stopRefreshClusterStatus);
}
