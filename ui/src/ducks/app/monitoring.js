import { put, takeEvery, call, all, delay, select } from 'redux-saga/effects';
import {
  getAlerts,
  queryPrometheus,
  queryPrometheusRange,
} from '../../services/prometheus/api';
import { getAlertsfromAlertManager } from '../../services/alertmanager/api';
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
const UPDATE_VOLUMESTATS = 'UPDATE_VOLUMESTATS';
const REFRESH_VOLUMESTATS = 'REFRESH_VOLUMESTATS';

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
  volumeStats: {},
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
    case UPDATE_VOLUMESTATS:
      return { ...state, volumeStats: action.payload };
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

export const updateClusterStatusAction = (payload) => {
  return { type: UPDATE_CLUSTER_STATUS, payload };
};

const setPrometheusApiAvailable = (payload) => {
  return { type: SET_PROMETHEUS_API_AVAILABLE, payload };
};

export const refreshAlertsAction = () => {
  return { type: REFRESH_ALERTS };
};

export const stopRefreshAlertsAction = () => {
  return { type: STOP_REFRESH_ALERTS };
};

export const updateAlertsAction = (payload) => {
  return { type: UPDATE_ALERTS, payload };
};

export const updateVolumeStatsAction = (payload) => {
  return { type: UPDATE_VOLUMESTATS, payload };
};

export const refreshVolumeStatsAction = () => {
  return { type: REFRESH_VOLUMESTATS };
};

// Selectors
export const isAlertRefreshing = (state) =>
  state.app.monitoring.alert.isRefreshing;
export const isClusterRefreshing = (state) =>
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
        (c) => c.type === 'PodScheduled',
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

  const errorResult = results.find((result) => result.error);

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
  // get the alerts from Alertmanager
  const resultAlertsfromAlertmanager = yield call(getAlertsfromAlertManager);

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

export function* refreshVolumeStats() {
  let volumeUsed = {};
  let volumeUsedCurrent = {};
  let volumeThroughputWrite = {};
  let volumeThroughputRead = {};
  let volumeLatency = {};
  let volumeLatencyCurrent = {};
  let volumeIOPSRead = {};
  let volumeIOPSWrite = {};

  const volumeUsedQuery = 'kubelet_volume_stats_used_bytes';
  const volumeLatencyCurrentQuery = 'node_disk_io_time_seconds_total';

  const volumeUsedCurrentQueryResult = yield call(
    queryPrometheus,
    volumeUsedQuery,
  );

  if (!volumeUsedCurrentQueryResult.error) {
    volumeUsedCurrent = volumeUsedCurrentQueryResult.data.result;
  }

  const volumeLantencyCurrentResult = yield call(
    queryPrometheus,
    volumeLatencyCurrentQuery,
  );
  if (!volumeLantencyCurrentResult.error) {
    volumeLatencyCurrent = volumeLantencyCurrentResult.data.result;
  }

  // To query Prometheus the date should follow `RFC3339` format
  const currentTimestamp = new Date().toISOString();
  let date = new Date();
  date.setDate(date.getDate() - 7);
  const sevenDaysAgoTime = date;
  const sevenDaysAgoTimestamp = date.toISOString();

  const volumeUsedQueryResult = yield call(
    queryPrometheusRange,
    sevenDaysAgoTimestamp,
    currentTimestamp,
    3600,
    volumeUsedQuery,
  );

  if (!volumeUsedQueryResult.error) {
    volumeUsed = volumeUsedQueryResult.data.result;
  }

  // the queries for Throughput/Latency/IOPS
  // rate calculates the per-second average rate of increase of the time series in the range vector.
  const volumeThroughputReadQuery = `rate(node_disk_read_bytes_total{job="node-exporter"}[1m])`;
  const volumeThroughputWriteQuery = `rate(node_disk_written_bytes_total{job="node-exporter"}[1m])`;
  const volumeLatencyQuery = `rate(node_disk_io_time_seconds_total{job="node-exporter"}[1m])`;
  const volumeIOPSReadQuery = `irate(node_disk_reads_completed_total{job="node-exporter"}[5m])`;
  const volumeIOPSWriteQuery = `irate(node_disk_writes_completed_total{job="node-exporter"}[5m])`;

  const volumeThroughputReadQueryResult = yield call(
    queryPrometheusRange,
    sevenDaysAgoTimestamp,
    currentTimestamp,
    3600, // samplingFrequency: time in seconds
    volumeThroughputReadQuery,
  );

  const volumeThroughputWriteQueryResult = yield call(
    queryPrometheusRange,
    sevenDaysAgoTimestamp,
    currentTimestamp,
    3600,
    volumeThroughputWriteQuery,
  );

  const volumeLatencyQueryResult = yield call(
    queryPrometheusRange,
    sevenDaysAgoTimestamp,
    currentTimestamp,
    3600,
    volumeLatencyQuery,
  );

  const volumeIOPSReadQueryResult = yield call(
    queryPrometheusRange,
    sevenDaysAgoTimestamp,
    currentTimestamp,
    3600,
    volumeIOPSReadQuery,
  );

  const volumeIOPSWriteQueryResult = yield call(
    queryPrometheusRange,
    sevenDaysAgoTimestamp,
    currentTimestamp,
    3600,
    volumeIOPSWriteQuery,
  );

  if (!volumeThroughputReadQueryResult.error) {
    volumeThroughputRead = volumeThroughputReadQueryResult.data.result;
  }

  if (!volumeThroughputWriteQueryResult.error) {
    volumeThroughputWrite = volumeThroughputWriteQueryResult.data.result;
  }

  if (!volumeLatencyQueryResult.error) {
    volumeLatency = volumeLatencyQueryResult.data.result;
  }

  if (!volumeIOPSReadQueryResult.error) {
    volumeIOPSRead = volumeIOPSReadQueryResult.data.result;
  }

  if (!volumeIOPSWriteQueryResult.error) {
    volumeIOPSWrite = volumeIOPSWriteQueryResult.data.result;
  }

  yield put(
    updateVolumeStatsAction({
      volumeUsedCurrent: volumeUsedCurrent,
      volumeUsed: volumeUsed,
      volumeThroughputWrite: volumeThroughputWrite,
      volumeThroughputRead: volumeThroughputRead,
      volumeLatency: volumeLatency,
      volumeLatencyCurrent: volumeLatencyCurrent,
      volumeIOPSRead: volumeIOPSRead,
      volumeIOPSWrite: volumeIOPSWrite,
      queryStartingTime: sevenDaysAgoTime,
    }),
  );
}

export function* monitoringSaga() {
  yield takeEvery(REFRESH_VOLUMESTATS, refreshVolumeStats);
  yield takeEvery(REFRESH_CLUSTER_STATUS, refreshClusterStatus);
  yield takeEvery(REFRESH_ALERTS, refreshAlerts);
  yield takeEvery(STOP_REFRESH_ALERTS, stopRefreshAlerts);
  yield takeEvery(STOP_REFRESH_CLUSTER_STATUS, stopRefreshClusterStatus);
}
