import {
  put,
  takeEvery,
  takeLatest,
  call,
  all,
  delay,
  select,
  take,
  cancel,
  fork,
  race,
} from 'redux-saga/effects';
import {
  getAlerts,
  queryPrometheus,
  queryPrometheusRange,
  RangeMatrixResult,
} from '../../services/prometheus/api';
import * as CoreApi from '../../services/k8s/core';
import {
  REFRESH_TIMEOUT,
  REFRESH_METRICS_GRAPH,
  LAST_SEVEN_DAYS,
  LAST_TWENTY_FOUR_HOURS,
  LAST_ONE_HOUR,
  SAMPLE_DURATION_LAST_SEVEN_DAYS,
  SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS,
  SAMPLE_DURATION_LAST_ONE_HOUR,
  SAMPLE_FREQUENCY_LAST_SEVEN_DAYS,
  SAMPLE_FREQUENCY_LAST_TWENTY_FOUR_HOURS,
  SAMPLE_FREQUENCY_LAST_ONE_HOUR,
  PORT_NODE_EXPORTER,
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

// To update the `app.monitoring.nodeStats.metrics`
const UPDATE_NODESTATS = 'UPDATE_NODESTATS';
const FETCH_NODESTATS = 'FETCH_NODESTATS';
const REFRESH_NODESTATS = 'REFRESH_NODESTATS';
const STOP_REFRESH_NODESTATS = 'STOP_REFRESH_NODESTATS';
// To update the arguments to fetch nodeStats
const UPDATE_NODESTATS_FETCH_ARG = 'UPDATE_NODESTATS_FETCH_ARG';
// To retrieve nodename label
const FETCH_NODE_UNAME_INFO = 'FETCH_NODE_UNAME_INFO';
const UPDATE_NODE_UNAME_INFO = 'UPDATE_NODE_UNAME_INFO';

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
  nodeStats: {
    metricsTimeSpan: LAST_TWENTY_FOUR_HOURS,
    showAvg: false,
    instanceIP: '',
    controlPlaneInterface: '',
    workloadPlaneInterface: '',
    metricsAvg: {
      cpuUsage: [],
      systemLoad: [],
      memory: [],
      iopsRead: [],
      iopsWrite: [],
      controlPlaneNetworkBandwidthIn: [],
      controlPlaneNetworkBandwidthOut: [],
      workloadPlaneNetworkBandwidthIn: [],
      workloadPlaneNetworkBandwidthOut: [],
      queryStartingTime: 0,
    },
    metrics: {
      cpuUsage: [],
      systemLoad: [],
      memory: [],
      iopsRead: [],
      iopsWrite: [],
      controlPlaneNetworkBandwidthIn: [],
      controlPlaneNetworkBandwidthOut: [],
      workloadPlaneNetworkBandwidthIn: [],
      workloadPlaneNetworkBandwidthOut: [],
      queryStartingTime: 0,
    },
    isRefreshing: false,
  },
  unameInfo: [],
};
export type MonitoringMetrics = {
  cpuUsage: RangeMatrixResult,
  systemLoad: RangeMatrixResult,
  memory: RangeMatrixResult,
  iopsRead: RangeMatrixResult,
  iopsWrite: RangeMatrixResult,
  controlPlaneNetworkBandwidthIn: RangeMatrixResult,
  controlPlaneNetworkBandwidthOut: RangeMatrixResult,
  workloadPlaneNetworkBandwidthIn: RangeMatrixResult,
  workloadPlaneNetworkBandwidthOut: RangeMatrixResult,
  queryStartingTime: number,
};

export type MonitoringState = {
  alert: {
    list: any[], // todo, type alert
    error: ?any,
    isLoading: boolean,
    isRefreshing: boolean,
  },
  cluster: {
    apiServerStatus: number,
    kubeSchedulerStatus: number,
    kubeControllerManagerStatus: number,
    error: ?any,
    isLoading: boolean,
    isRefreshing: boolean,
    isPrometheusVolumeProvisioned: boolean,
  },
  isPrometheusApiUp: boolean,
  volumeStats: {
    metricsTimeSpan: string,
    metrics: {
      volumeUsed: any[], // todo, identify this type
      volumeThroughputWrite: any[], // todo, identify this type
      volumeThroughputRead: any[], // todo, identify this type
      volumeLatency: any[], // todo, identify this type
      volumeIOPSRead: any[], // todo, identify this type
      volumeIOPSWrite: any[], // todo, identify this type
    },
    isRefreshing: boolean,
  },
  volumeCurrentStats: {
    metrics: {
      volumeUsedCurrent: [], // todo, identify this type
      volumeCapacityCurrent: [], // todo, identify this type
      volumeLatencyCurrent: [], // todo, identify this type
    },
    isRefreshing: boolean,
  },
  nodeStats: {
    metricsTimeSpan: string,
    instanceIP: string,
    controlPlaneInterface: string,
    workloadPlaneInterface: string,
    metrics: MonitoringMetrics,
    metricsAvg: MonitoringMetrics,
    showAvg: boolean,
    isRefreshing: boolean,
  },
  unameInfo: any[], // todo, identify this type
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
    case UPDATE_NODESTATS:
    case UPDATE_NODESTATS_FETCH_ARG:
      return {
        ...state,
        nodeStats: { ...state.nodeStats, ...action.payload },
      };
    case UPDATE_NODE_UNAME_INFO:
      return {
        ...state,
        ...action.payload,
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
export const fetchNodeStatsAction = () => {
  return { type: FETCH_NODESTATS };
};
export const updateNodeStatsAction = (payload) => {
  return { type: UPDATE_NODESTATS, payload };
};
export const refreshNodeStatsAction = () => {
  return { type: REFRESH_NODESTATS };
};
export const stopRefreshNodeStatsAction = () => {
  return { type: STOP_REFRESH_NODESTATS };
};
export const updateNodeStatsFetchArgumentAction = (payload) => {
  return { type: UPDATE_NODESTATS_FETCH_ARG, payload };
};
export const fetchNodeUNameInfoAction = () => {
  return { type: FETCH_NODE_UNAME_INFO };
};
export const updateNodeUNameInfoAction = (payload) => {
  return { type: UPDATE_NODE_UNAME_INFO, payload };
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
const volumeMetricsTimeSpan = (state) =>
  state.app.monitoring.volumeStats.metricsTimeSpan;
const nodeMetricsTimeSpan = (state) =>
  state.app.monitoring.nodeStats.metricsTimeSpan;
export const isNodeStatsRefreshing = (state) =>
  state.app.monitoring.nodeStats.isRefreshing;
const instanceIPSelector = (state) => state.app.monitoring.nodeStats.instanceIP;
const controlPlaneInterfaceSelector = (state) =>
  state.app.monitoring.nodeStats.controlPlaneInterface;
const workloadPlaneInterfaceSelector = (state) =>
  state.app.monitoring.nodeStats.workloadPlaneInterface;
export const nodeMetricsShowAvgSelector = (state) =>
  state.app.monitoring.nodeStats.showAvg;

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
  // TODO:
  // Type result argument to something similar to {error: {response?: AxiosResponse} } to simplify optional chaining use here.
  if (result?.error?.response?.status < 500) {
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
  let volumeUsage = [];
  let volumeThroughputWrite = [];
  let volumeThroughputRead = [];
  let volumeLatencyWrite = [];
  let volumeLatencyRead = [];
  let volumeIOPSRead = [];
  let volumeIOPSWrite = [];

  let sampleDuration;
  let sampleFrequency;

  const timeSpan = yield select(volumeMetricsTimeSpan);
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

  // Effects will get executed in parallel
  const [
    volumeUsageQueryResult,
    volumeThroughputReadQueryResult,
    volumeThroughputWriteQueryResult,
    volumeLatencyQueryWriteResult,
    volumeLatencyQueryReadResult,
    volumeIOPSReadQueryResult,
    volumeIOPSWriteQueryResult,
  ] = yield all([
    call(
      queryPrometheusRange,
      startingTimeISO,
      currentTimeISO,
      sampleFrequency,
      volumeUsageQuery,
    ),
    call(
      queryPrometheusRange,
      startingTimeISO,
      currentTimeISO,
      sampleFrequency,
      volumeThroughputReadQuery,
    ),
    call(
      queryPrometheusRange,
      startingTimeISO,
      currentTimeISO,
      sampleFrequency,
      volumeThroughputWriteQuery,
    ),
    call(
      queryPrometheusRange,
      startingTimeISO,
      currentTimeISO,
      sampleFrequency,
      volumeLatencyWriteQuery,
    ),
    call(
      queryPrometheusRange,
      startingTimeISO,
      currentTimeISO,
      sampleFrequency,
      volumeLatencyReadQuery,
    ),
    call(
      queryPrometheusRange,
      startingTimeISO,
      currentTimeISO,
      sampleFrequency,
      volumeIOPSReadQuery,
    ),
    call(
      queryPrometheusRange,
      startingTimeISO,
      currentTimeISO,
      sampleFrequency,
      volumeIOPSWriteQuery,
    ),
  ]);

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
    volumeUsage,
    volumeThroughputWrite,
    volumeThroughputRead,
    volumeLatencyWrite,
    volumeLatencyRead,
    volumeIOPSWrite,
    volumeIOPSRead,
    queryStartingTime: startingTimestamp,
  };

  yield put(updateVolumeStatsAction({ metrics }));
}

export function* fetchCurrentVolumeStats() {
  let volumeUsedCurrent = [];
  let volumeCapacityCurrent = [];
  let volumeLatencyCurrent = [];

  const volumeLatencyCurrentQuery = `irate(node_disk_io_time_seconds_total[1h]) * 1000000`;
  // Grafana - Used Space: kubelet_volume_stats_capacity_bytes - kubelet_volume_stats_available_bytes
  const volumeUsedQuery = 'kubelet_volume_stats_used_bytes';
  const volumeCapacityQuery = 'kubelet_volume_stats_capacity_bytes';

  const [
    volumeUsedCurrentQueryResult,
    volumeCapacityCurrentQueryResult,
    volumeLatencyCurrentResult,
  ] = yield all([
    call(queryPrometheus, volumeUsedQuery),
    call(queryPrometheus, volumeCapacityQuery),
    call(queryPrometheus, volumeLatencyCurrentQuery),
  ]);

  if (!volumeUsedCurrentQueryResult.error) {
    volumeUsedCurrent = volumeUsedCurrentQueryResult.data.result;
  }

  if (!volumeCapacityCurrentQueryResult.error) {
    volumeCapacityCurrent = volumeCapacityCurrentQueryResult.data.result;
  }

  if (!volumeLatencyCurrentResult.error) {
    volumeLatencyCurrent = volumeLatencyCurrentResult.data.result;
  }

  const metrics = {
    volumeUsedCurrent,
    volumeCapacityCurrent,
    volumeLatencyCurrent,
  };
  yield put(updateCurrentVolumeStatsAction({ metrics: metrics }));
}

// improvement: we should extract an auto-refresh module
export function* refreshVolumeStats() {
  yield put(updateVolumeStatsAction({ isRefreshing: true }));
  yield call(fetchVolumeStats);

  yield delay(REFRESH_METRICS_GRAPH);
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
  yield delay(REFRESH_METRICS_GRAPH);
  const isRefreshing = yield select(isCurrentVolumeStatsRefresh);
  if (isRefreshing) {
    yield call(refreshCurrentVolumeStats);
  }
}

export function* stopRefreshCurrentStats() {
  yield put(updateCurrentVolumeStatsAction({ isRefreshing: false }));
}

export function* fetchNodeStats() {
  const instanceIP = yield select(instanceIPSelector);
  const controlPlaneInterface = yield select(controlPlaneInterfaceSelector);
  const workloadPlaneInterface = yield select(workloadPlaneInterfaceSelector);
  const showAvg = yield select(nodeMetricsShowAvgSelector);

  let cpuUsage = [];
  let systemLoad = [];
  let memory = [];
  let iopsRead = [];
  let iopsWrite = [];
  let controlPlaneNetworkBandwidthIn = [];
  let controlPlaneNetworkBandwidthOut = [];
  let workloadPlaneNetworkBandwidthIn = [];
  let workloadPlaneNetworkBandwidthOut = [];
  let cpuUsageAvg = [];
  let systemLoadAvg = [];
  let memoryAvg = [];
  let iopsReadAvg = [];
  let iopsWriteAvg = [];
  let controlPlaneNetworkBandwidthInAvg = [];
  let controlPlaneNetworkBandwidthOutAvg = [];
  let workloadPlaneNetworkBandwidthInAvg = [];
  let workloadPlaneNetworkBandwidthOutAvg = [];

  let sampleDuration;
  let sampleFrequency;

  const timeSpan = yield select(nodeMetricsTimeSpan);
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

  const cpuUsageQuery = `100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle",instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}[5m])) * 100)`;
  const systemLoadQuery = `avg(node_load1{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}) / count(count(node_cpu_seconds_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}) by (cpu)) * 100`;
  const memoryQuery = `sum(100 - ((node_memory_MemAvailable_bytes{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"} * 100) / node_memory_MemTotal_bytes{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}))`;
  const iopsReadQuery = `sum(irate(node_disk_reads_completed_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}[5m])) by (instance)`;
  const iopsWriteQuery = `sum(irate(node_disk_writes_completed_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}[5m])) by (instance)`;
  const controlPlaneNetworkBandwidthInQuery = `sum(irate(node_network_receive_bytes_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",device="${controlPlaneInterface}"}[5m])) * 0.000001`;
  const controlPlaneNetworkBandwidthOutQuery = `sum(irate(node_network_transmit_bytes_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",device="${controlPlaneInterface}"}[5m])) * 0.000001`;
  const workloadPlaneNetworkBandwidthInQuery = `sum(irate(node_network_receive_bytes_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",device="${workloadPlaneInterface}"}[5m])) * 0.000001`;
  const workloadPlaneNetworkBandwidthOutQuery = `sum(irate(node_network_transmit_bytes_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",device="${workloadPlaneInterface}"}[5m])) * 0.000001`;

  const cpuUsageAvgQuery = `avg(100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100))`;
  const systemLoadAvgQuery = `avg(node_load1/count without(cpu, mode) (node_cpu_seconds_total{mode="idle"})) * 100`;
  const memoryAvgQuery = `avg(100 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)`;
  const iopsWriteAvgQuery = `avg(sum(irate(node_disk_writes_completed_total[5m])) by (instance))`;
  const iopsReadAvgQuery = `avg(sum(irate(node_disk_reads_completed_total[5m])) by (instance))`;
  const controlPlaneNetworkBandwidthInAvgQuery = `avg(irate(node_network_receive_bytes_total{job=~"node-exporter",device=~"${controlPlaneInterface}"}[5m]))* 0.000001`;
  const controlPlaneNetworkBandwidthOutAvgQuery = `avg(irate(node_network_transmit_bytes_total{job=~"node-exporter",device=~"${controlPlaneInterface}"}[5m]))* 0.000001`;
  const workloadPlaneNetworkBandwidthInAvgQuery = `avg(irate(node_network_receive_bytes_total{job=~"node-exporter",device=~"${workloadPlaneInterface}"}[5m]))* 0.000001`;
  const workloadPlaneNetworkBandwidthOutAvgQuery = `avg(irate(node_network_transmit_bytes_total{job=~"node-exporter",device=~"${workloadPlaneInterface}"}[5m]))* 0.000001`;

  // Make sure the props are ready before sending the requests.
  if (instanceIP && controlPlaneInterface && workloadPlaneInterface) {
    // Running Tasks In Parallel
    const [
      cpuUsageQueryResult,
      systemLoadQueryResult,
      memoryQueryResult,
      iopsReadQueryResult,
      iopsWriteQueryResult,
      controlPlaneNetworkBandwidthInQueryResult,
      controlPlaneNetworkBandwidthOutQueryResult,
      workloadPlaneNetworkBandwidthInQueryResult,
      workloadPlaneNetworkBandwidthOutQueryResult,
    ] = yield all([
      call(
        queryPrometheusRange,
        startingTimeISO,
        currentTimeISO,
        sampleFrequency,
        cpuUsageQuery,
      ),
      call(
        queryPrometheusRange,
        startingTimeISO,
        currentTimeISO,
        sampleFrequency,
        systemLoadQuery,
      ),
      call(
        queryPrometheusRange,
        startingTimeISO,
        currentTimeISO,
        sampleFrequency,
        memoryQuery,
      ),
      call(
        queryPrometheusRange,
        startingTimeISO,
        currentTimeISO,
        sampleFrequency,
        iopsReadQuery,
      ),
      call(
        queryPrometheusRange,
        startingTimeISO,
        currentTimeISO,
        sampleFrequency,
        iopsWriteQuery,
      ),
      call(
        queryPrometheusRange,
        startingTimeISO,
        currentTimeISO,
        sampleFrequency,
        controlPlaneNetworkBandwidthInQuery,
      ),
      call(
        queryPrometheusRange,
        startingTimeISO,
        currentTimeISO,
        sampleFrequency,
        controlPlaneNetworkBandwidthOutQuery,
      ),
      call(
        queryPrometheusRange,
        startingTimeISO,
        currentTimeISO,
        sampleFrequency,
        workloadPlaneNetworkBandwidthInQuery,
      ),
      call(
        queryPrometheusRange,
        startingTimeISO,
        currentTimeISO,
        sampleFrequency,
        workloadPlaneNetworkBandwidthOutQuery,
      ),
    ]);

    if (showAvg) {
      const [
        cpuUsageAvgQueryResult,
        systemLoadAvgQueryResult,
        memoryAvgQueryResult,
        iopsReadAvgQueryResult,
        iopsWriteAvgQueryResult,
        controlPlaneNetworkBandwidthInAvgQueryResult,
        controlPlaneNetworkBandwidthOutAvgQueryResult,
        workloadPlaneNetworkBandwidthInAvgQueryResult,
        workloadPlaneNetworkBandwidthOutAvgQueryResult,
      ] = yield all([
        call(
          queryPrometheusRange,
          startingTimeISO,
          currentTimeISO,
          sampleFrequency,
          cpuUsageAvgQuery,
        ),
        call(
          queryPrometheusRange,
          startingTimeISO,
          currentTimeISO,
          sampleFrequency,
          systemLoadAvgQuery,
        ),
        call(
          queryPrometheusRange,
          startingTimeISO,
          currentTimeISO,
          sampleFrequency,
          memoryAvgQuery,
        ),
        call(
          queryPrometheusRange,
          startingTimeISO,
          currentTimeISO,
          sampleFrequency,
          iopsReadAvgQuery,
        ),
        call(
          queryPrometheusRange,
          startingTimeISO,
          currentTimeISO,
          sampleFrequency,
          iopsWriteAvgQuery,
        ),
        call(
          queryPrometheusRange,
          startingTimeISO,
          currentTimeISO,
          sampleFrequency,
          controlPlaneNetworkBandwidthInAvgQuery,
        ),
        call(
          queryPrometheusRange,
          startingTimeISO,
          currentTimeISO,
          sampleFrequency,
          controlPlaneNetworkBandwidthOutAvgQuery,
        ),
        call(
          queryPrometheusRange,
          startingTimeISO,
          currentTimeISO,
          sampleFrequency,
          workloadPlaneNetworkBandwidthInAvgQuery,
        ),
        call(
          queryPrometheusRange,
          startingTimeISO,
          currentTimeISO,
          sampleFrequency,
          workloadPlaneNetworkBandwidthOutAvgQuery,
        ),
      ]);

      if (!cpuUsageAvgQueryResult.error) {
        cpuUsageAvg = cpuUsageAvgQueryResult.data.result;
      }
      if (!systemLoadAvgQueryResult.error) {
        systemLoadAvg = systemLoadAvgQueryResult.data.result;
      }
      if (!memoryAvgQueryResult.error) {
        memoryAvg = memoryAvgQueryResult.data.result;
      }
      if (!iopsReadAvgQueryResult.error) {
        iopsReadAvg = iopsReadAvgQueryResult.data.result;
      }
      if (!iopsWriteAvgQueryResult.error) {
        iopsWriteAvg = iopsWriteAvgQueryResult.data.result;
      }
      if (!controlPlaneNetworkBandwidthInAvgQueryResult.error) {
        controlPlaneNetworkBandwidthInAvg =
          controlPlaneNetworkBandwidthInAvgQueryResult.data.result;
      }
      if (!controlPlaneNetworkBandwidthOutAvgQueryResult.error) {
        controlPlaneNetworkBandwidthOutAvg =
          controlPlaneNetworkBandwidthOutAvgQueryResult.data.result;
      }
      if (!workloadPlaneNetworkBandwidthInAvgQueryResult.error) {
        workloadPlaneNetworkBandwidthInAvg =
          workloadPlaneNetworkBandwidthInAvgQueryResult.data.result;
      }
      if (!workloadPlaneNetworkBandwidthOutAvgQueryResult.error) {
        workloadPlaneNetworkBandwidthOutAvg =
          workloadPlaneNetworkBandwidthOutAvgQueryResult.data.result;
      }
    }
    // Running Average Tasks In Parallel

    if (!cpuUsageQueryResult.error) {
      cpuUsage = cpuUsageQueryResult.data.result;
    }
    if (!systemLoadQueryResult.error) {
      systemLoad = systemLoadQueryResult.data.result;
    }
    if (!memoryQueryResult.error) {
      memory = memoryQueryResult.data.result;
    }
    if (!iopsReadQueryResult.error) {
      iopsRead = iopsReadQueryResult.data.result;
    }
    if (!iopsWriteQueryResult.error) {
      iopsWrite = iopsWriteQueryResult.data.result;
    }
    if (!controlPlaneNetworkBandwidthInQueryResult.error) {
      controlPlaneNetworkBandwidthIn =
        controlPlaneNetworkBandwidthInQueryResult.data.result;
    }
    if (!controlPlaneNetworkBandwidthOutQueryResult.error) {
      controlPlaneNetworkBandwidthOut =
        controlPlaneNetworkBandwidthOutQueryResult.data.result;
    }
    if (!workloadPlaneNetworkBandwidthInQueryResult.error) {
      workloadPlaneNetworkBandwidthIn =
        workloadPlaneNetworkBandwidthInQueryResult.data.result;
    }
    if (!workloadPlaneNetworkBandwidthOutQueryResult.error) {
      workloadPlaneNetworkBandwidthOut =
        workloadPlaneNetworkBandwidthOutQueryResult.data.result;
    }

    const metrics = {
      cpuUsage,
      systemLoad,
      memory,
      iopsRead,
      iopsWrite,
      controlPlaneNetworkBandwidthIn,
      controlPlaneNetworkBandwidthOut,
      workloadPlaneNetworkBandwidthIn,
      workloadPlaneNetworkBandwidthOut,
      queryStartingTime: startingTimestamp,
    };

    const metricsAvg = {
      cpuUsage: cpuUsageAvg,
      systemLoad: systemLoadAvg,
      memory: memoryAvg,
      iopsRead: iopsReadAvg,
      iopsWrite: iopsWriteAvg,
      controlPlaneNetworkBandwidthIn: controlPlaneNetworkBandwidthInAvg,
      controlPlaneNetworkBandwidthOut: controlPlaneNetworkBandwidthOutAvg,
      workloadPlaneNetworkBandwidthIn: workloadPlaneNetworkBandwidthInAvg,
      workloadPlaneNetworkBandwidthOut: workloadPlaneNetworkBandwidthOutAvg,
      queryStartingTime: startingTimestamp,
    };

    yield put(updateNodeStatsAction({ metrics: metrics, metricsAvg }));
  }
}

// A long-running saga to handle the refresh, we should launch this saga as part of the root saga.
// Avoid starting it manually to make sure there is only one loop that exists.
export function* watchRefreshNodeStats() {
  while (true) {
    yield take(REFRESH_NODESTATS);
    while (true) {
      const fetchNodeStatsTask = yield fork(fetchNodeStats);
      const { interrupt } = yield race({
        interrupt: take(STOP_REFRESH_NODESTATS),
        // If the refresh period expires before we receive a halt,
        // we can refresh the stats
        requeue: delay(REFRESH_METRICS_GRAPH),
        // whenever we change one of the parameters for "fetchNodeStats",
        // it gets triggered again
        update: take(UPDATE_NODESTATS_FETCH_ARG),
      });
      if (interrupt) {
        yield cancel(fetchNodeStatsTask);
        break;
      }
    }
  }
}

export function* fetchNodeUNameInfo() {
  const fetchNodeUNameInfoQuery = 'node_uname_info';
  const result = yield call(queryPrometheus, fetchNodeUNameInfoQuery);
  if (!result.error) {
    yield put(updateNodeUNameInfoAction({ unameInfo: result.data.result }));
  }
}

export function* monitoringSaga() {
  yield fork(watchRefreshNodeStats);
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
  yield takeEvery(FETCH_NODESTATS, fetchNodeStats);
  yield takeEvery(FETCH_NODE_UNAME_INFO, fetchNodeUNameInfo);
}
