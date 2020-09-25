import { put, takeEvery, takeLatest, call, all, delay, select } from 'redux-saga/effects';
import {
  getAlerts,
  queryPrometheus,
  queryPrometheusRange,
} from '../../services/prometheus/api';
import * as CoreApi from '../../services/k8s/core';
import {
  REFRESH_TIMEOUT,
  REFRESH_METRCIS_GRAPH,
  LAST_SEVEN_DAYS,
  LAST_TWENTY_FOUR_HOURS,
  LAST_ONE_HOUR,
  SAMPLE_DURATION_LAST_SEVEN_DAYS,
  SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS,
  SAMPLE_DURATION_LAST_ONE_HOUR,
  SAMPLE_FREQUENCY_LAST_SEVEN_DAYS,
  SAMPLE_FREQUENCY_LAST_TWENTY_FOUR_HOURS,
  SAMPLE_FREQUENCY_LAST_ONE_HOUR,
} from '../../constants';

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
const FETCH_VOLUMESTATS = 'FETCH_VOLUMESTATS';
const REFRESH_VOLUMESTATS = 'REFRESH_VOLUMESTATS';
const STOP_REFRESH_VOLUMESTATS = 'STOP_REFRESH_VOLUMESTATS';

const UPDATE_CURRENT_VOLUMESTATS = 'UPDATE_CURRENT_VOLUMESTATS';
const FETCH_CURRENT_VOLUESTATS = 'FETCH_CURRENT_VOLUESTATS';
const REFRESH_CURRENT_VOLUMESTATS = 'REFRESH_CURRENT_VOLUMESTATS';
const STOP_REFRESH_CURRENT_VOLUMESTATS = 'STOP_REFRESH_CURRENT_VOLUMESTATS';

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
  volumeStats: {
    metricsTimeSpan: LAST_TWENTY_FOUR_HOURS,
    metrics: {
      volumeUsed: [],
      volumeThroughputWrite: [],
      volumeThroughputRead: [],
      volumeLatency: [],
      volumeIOPSRead: [],
      volumeIOPSWrite: [],
    },
    isRefreshing: false,
  },
  volumeCurrentStats: {
    metrics: {
      volumeUsedCurrent: [],
      volumeCapacityCurrent: [],
      volumeLatencyCurrent: [],
    },
    isRefreshing: false,
  },
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
      return {
        ...state,
        volumeStats: { ...state.volumeStats, ...action.payload },
      };
    case UPDATE_CURRENT_VOLUMESTATS:
      return {
        ...state,
        volumeCurrentStats: { ...state.volumeCurrentStats, ...action.payload },
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

export const fetchVolumeStatsAction = (payload) => {
  return { type: FETCH_VOLUMESTATS, payload };
};

export const refreshVolumeStatsAction = (payload) => {
  return { type: REFRESH_VOLUMESTATS, payload };
};

export const stopRefreshVolumeStatsAction = () => {
  return { type: STOP_REFRESH_VOLUMESTATS };
};
export const fetchCurrentVolumeStatsAction = () => {
  return { type: FETCH_CURRENT_VOLUESTATS };
};
export const refreshCurrentVolumeStatsAction = () => {
  return { type: REFRESH_CURRENT_VOLUMESTATS };
};
export const stopRefreshCurrentVolumeStatsAction = () => {
  return { type: STOP_REFRESH_CURRENT_VOLUMESTATS };
};
export const updateCurrentVolumeStatsAction = (payload) => {
  return { type: UPDATE_CURRENT_VOLUMESTATS, payload };
};

// Selectors
export const isAlertRefreshing = (state) =>
  state.app.monitoring.alert.isRefreshing;
export const isClusterRefreshing = (state) =>
  state.app.monitoring.cluster.isRefreshing;
export const isVolumeStatsRefreshing = (state) =>
  state.app.monitoring.volumeStats.isRefreshing;
export const isCurrentVolumeStatsRefresh = (state) =>
  state.app.monitoring.volumeCurrentStats.isRefreshing;
export const metricsTimeSpan = (state) =>
  state.app.monitoring.volumeStats.metricsTimeSpan;

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
      CoreApi.queryPodInNamespace,
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

export function* fetchVolumeStats() {
  let volumeUsage = {};
  let volumeThroughputWrite = {};
  let volumeThroughputRead = {};
  let volumeLatencyWrite = {};
  let volumeLatencyRead = {};
  let volumeIOPSRead = {};
  let volumeIOPSWrite = {};

  let sampleDuration;
  let sampleFrequency;

  const timeSpan = yield select(metricsTimeSpan);
  if (timeSpan === LAST_TWENTY_FOUR_HOURS) {
    sampleDuration = SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS;
    sampleFrequency = SAMPLE_FREQUENCY_LAST_TWENTY_FOUR_HOURS;
  } else if (timeSpan === LAST_SEVEN_DAYS) {
    sampleDuration = SAMPLE_DURATION_LAST_SEVEN_DAYS;
    sampleFrequency = SAMPLE_FREQUENCY_LAST_SEVEN_DAYS;
  } else if (timeSpan === LAST_ONE_HOUR) {
    sampleDuration = SAMPLE_DURATION_LAST_ONE_HOUR;
    sampleFrequency = SAMPLE_FREQUENCY_LAST_ONE_HOUR;
  }

  const currentTime = new Date();
  const currentTimeISO = currentTime.toISOString(); // To query Prometheus the date should follow `RFC3339` format
  const startingTimestamp =
    Math.round(currentTime.getTime() / 1000) - sampleDuration;
  const startingTimeISO = new Date(startingTimestamp * 1000).toISOString();
  const volumeUsageQuery =
    'kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes';

  // the queries for `Throughput` and `IOPS`
  // rate calculates the per-second average rate of increase of the time series in the range vector.
  // group the result of the query by instance and device (remove the filter {job="node-exporter"})
  const volumeThroughputReadQuery = `sum(irate(node_disk_read_bytes_total[1m])) by (instance, device) * 0.000001`;
  const volumeThroughputWriteQuery = `sum(irate(node_disk_written_bytes_total[1m])) by (instance, device) * 0.000001`;
  const volumeIOPSReadQuery = `sum(irate(node_disk_reads_completed_total[5m])) by (instance, device)`;
  const volumeIOPSWriteQuery = `sum(irate(node_disk_writes_completed_total[5m])) by (instance, device)`;

  // the query for `latency`
  // Disk latency is the time that it takes to complete a single I/O operation on a block device
  const volumeLatencyWriteQuery = `sum(irate(node_disk_write_time_seconds_total[5m]) / irate(node_disk_writes_completed_total[5m])) by (instance, device) * 1000000`;
  const volumeLatencyReadQuery = `sum(irate(node_disk_read_time_seconds_total[5m]) / irate(node_disk_reads_completed_total[5m])) by (instance, device) * 1000000`;

  const volumeUsageQueryResult = yield call(
    queryPrometheusRange,
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    volumeUsageQuery,
  );

  const volumeThroughputReadQueryResult = yield call(
    queryPrometheusRange,
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    volumeThroughputReadQuery,
  );

  const volumeThroughputWriteQueryResult = yield call(
    queryPrometheusRange,
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    volumeThroughputWriteQuery,
  );

  const volumeLatencyQueryWriteResult = yield call(
    queryPrometheusRange,
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    volumeLatencyWriteQuery,
  );

  const volumeLatencyQueryReadResult = yield call(
    queryPrometheusRange,
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    volumeLatencyReadQuery,
  );

  const volumeIOPSReadQueryResult = yield call(
    queryPrometheusRange,
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    volumeIOPSReadQuery,
  );

  const volumeIOPSWriteQueryResult = yield call(
    queryPrometheusRange,
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    volumeIOPSWriteQuery,
  );

  if (!volumeUsageQueryResult.error) {
    volumeUsage = volumeUsageQueryResult.data.result;
  }

  if (!volumeThroughputReadQueryResult.error) {
    volumeThroughputRead = volumeThroughputReadQueryResult.data.result;
  }

  if (!volumeThroughputWriteQueryResult.error) {
    volumeThroughputWrite = volumeThroughputWriteQueryResult.data.result;
  }

  if (!volumeLatencyQueryWriteResult.error) {
    volumeLatencyWrite = volumeLatencyQueryWriteResult.data.result;
  }

  if (!volumeLatencyQueryReadResult.error) {
    volumeLatencyRead = volumeLatencyQueryReadResult.data.result;
  }

  if (!volumeIOPSReadQueryResult.error) {
    volumeIOPSRead = volumeIOPSReadQueryResult.data.result;
  }

  if (!volumeIOPSWriteQueryResult.error) {
    volumeIOPSWrite = volumeIOPSWriteQueryResult.data.result;
  }

  const metrics = {
    volumeUsage: volumeUsage,
    volumeThroughputWrite: volumeThroughputWrite,
    volumeThroughputRead: volumeThroughputRead,
    volumeLatencyWrite: volumeLatencyWrite,
    volumeLatencyRead: volumeLatencyRead,
    volumeIOPSWrite: volumeIOPSWrite,
    volumeIOPSRead: volumeIOPSRead,
    queryStartingTime: startingTimestamp,
  };

  yield put(updateVolumeStatsAction({ metrics }));
}

export function* fetchCurrentVolumeStats() {
  let volumeUsedCurrent = {};
  let volumeCapacityCurrent = {};
  let volumeLatencyCurrent = {};

  const volumeLatencyCurrentQuery = `irate(node_disk_io_time_seconds_total[1h]) * 1000000`;
  // Grafana - Used Space: kubelet_volume_stats_capacity_bytes - kubelet_volume_stats_available_bytes
  const volumeUsedQuery = 'kubelet_volume_stats_used_bytes';
  const volumeCapacityQuery = 'kubelet_volume_stats_capacity_bytes';

  const volumeUsedCurrentQueryResult = yield call(
    queryPrometheus,
    volumeUsedQuery,
  );
  if (!volumeUsedCurrentQueryResult.error) {
    volumeUsedCurrent = volumeUsedCurrentQueryResult.data.result;
  }

  const volumeCapacityCurrentQueryResult = yield call(
    queryPrometheus,
    volumeCapacityQuery,
  );
  if (!volumeCapacityCurrentQueryResult.error) {
    volumeCapacityCurrent = volumeCapacityCurrentQueryResult.data.result;
  }

  const volumeLatencyCurrentResult = yield call(
    queryPrometheus,
    volumeLatencyCurrentQuery,
  );
  if (!volumeLatencyCurrentResult.error) {
    volumeLatencyCurrent = volumeLatencyCurrentResult.data.result;
  }

  const metrics = {
    volumeUsedCurrent: volumeUsedCurrent,
    volumeCapacityCurrent: volumeCapacityCurrent,
    volumeLatencyCurrent: volumeLatencyCurrent,
  };
  yield put(updateCurrentVolumeStatsAction({ metrics: metrics }));
}

// improvement: we should extract an auto-refresh module
export function* refreshVolumeStats() {
  yield put(updateVolumeStatsAction({ isRefreshing: true }));
  yield call(fetchVolumeStats);

  yield delay(REFRESH_METRCIS_GRAPH);
  const isRefreshing = yield select(isVolumeStatsRefreshing);
  if (isRefreshing) {
    yield call(refreshVolumeStats);
  }
}

export function* stopRefreshVolumeStats() {
  yield put(updateVolumeStatsAction({ isRefreshing: false }));
}

export function* refreshCurrentVolumeStats() {
  yield put(updateCurrentVolumeStatsAction({ isRefreshing: true }));
  yield call(fetchCurrentVolumeStats);
  yield delay(REFRESH_METRCIS_GRAPH);
  const isRefreshing = yield select(isCurrentVolumeStatsRefresh);
  if (isRefreshing) {
    yield call(refreshCurrentVolumeStats);
  }
}

export function* stopRefreshCurrentStats() {
  yield put(updateCurrentVolumeStatsAction({ isRefreshing: false }));
}

export function* monitoringSaga() {
  yield takeLatest(FETCH_VOLUMESTATS, fetchVolumeStats);
  yield takeEvery(REFRESH_VOLUMESTATS, refreshVolumeStats);
  yield takeEvery(STOP_REFRESH_VOLUMESTATS, stopRefreshVolumeStats);
  yield takeLatest(FETCH_CURRENT_VOLUESTATS, fetchCurrentVolumeStats);
  yield takeEvery(REFRESH_CURRENT_VOLUMESTATS, refreshCurrentVolumeStats);
  yield takeEvery(STOP_REFRESH_CURRENT_VOLUMESTATS, stopRefreshCurrentStats);
  yield takeEvery(REFRESH_CLUSTER_STATUS, refreshClusterStatus);
  yield takeEvery(REFRESH_ALERTS, refreshAlerts);
  yield takeEvery(STOP_REFRESH_ALERTS, stopRefreshAlerts);
  yield takeEvery(STOP_REFRESH_CLUSTER_STATUS, stopRefreshClusterStatus);
}
