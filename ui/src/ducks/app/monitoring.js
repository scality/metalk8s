import { put, takeEvery, select, call, all } from 'redux-saga/effects';
import { getAlerts, queryPrometheus } from '../../services/prometheus/api';

const FETCH_ALERTS = 'FETCH_ALERTS';
const SET_ALERTS = 'SET_ALERTS';

const FETCH_CLUSTER_STATUS = 'FETCH_CLUSTER_STATUS';
export const SET_CLUSTER_STATUS = 'SET_CLUSTER_STATUS';
export const SET_APISERVER_STATUS = 'SET_APISERVER_STATUS';
export const SET_KUBESCHEDULER_STATUS = 'SET_KUBESCHEDULER_STATUS';
export const SET_KUBECONTROLLER_MANAGER_STATUS =
  'SET_KUBECONTROLLER_MANAGER_STATUS';

const defaultState = {
  alertList: [],
  cluster: {
    // Will be change with Carlito PR
    status: false,
    apiServerStatus: [],
    kubeSchedulerStatus: [],
    kubeControllerManagerStatus: []
  }
};

export default function(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_ALERTS:
      return { ...state, alertList: action.payload };
    case SET_APISERVER_STATUS:
      return {
        ...state,
        cluster: { ...state.cluster, apiServerStatus: action.payload }
      };
    case SET_KUBESCHEDULER_STATUS:
      return {
        ...state,
        cluster: { ...state.cluster, kubeSchedulerStatus: action.payload }
      };
    case SET_KUBECONTROLLER_MANAGER_STATUS:
      return {
        ...state,
        cluster: {
          ...state.cluster,
          kubeControllerManagerStatus: action.payload
        }
      };
    case SET_CLUSTER_STATUS:
      return {
        ...state,
        cluster: { ...state.cluster, status: action.payload }
      };
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

export const setApiServerStatusAction = payload => {
  return { type: SET_APISERVER_STATUS, payload };
};

export const setKubeSchedulerStatusAction = payload => {
  return { type: SET_KUBESCHEDULER_STATUS, payload };
};

export const setKubeControllerManagerStatus = payload => {
  return { type: SET_KUBECONTROLLER_MANAGER_STATUS, payload };
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

  const apiserverQuery = 'sum(up{job="apiserver"})';
  const kubeSchedulerQuery = 'sum(up{job="kube-scheduler"})';
  const kubeControllerManagerQuery = 'sum(up{job="kube-controller-manager"})';

  const results = yield all([
    call(queryPrometheus, api.url_prometheus, apiserverQuery),
    call(queryPrometheus, api.url_prometheus, kubeSchedulerQuery),
    call(queryPrometheus, api.url_prometheus, kubeControllerManagerQuery)
  ]);

  const apiserver = results[0];
  const apiServerValue = apiserver.data.data.result[0].value;

  const kubeScheduler = results[1];
  const kubeSchedulerValue = kubeScheduler.data.data.result[0].value;

  const kubeControllerManager = results[2];
  const kubeControllerManagerValue =
    kubeControllerManager.data.data.result[0].value;

  if (apiserver && apiserver.data && apiserver.data.status === 'success') {
    const apiServerValue = apiserver.data.data.result[0].value;
    yield put(setApiServerStatusAction(apiServerValue));
  }

  if (
    kubeScheduler &&
    kubeScheduler.data &&
    kubeScheduler.data.status === 'success'
  ) {
    yield put(setKubeSchedulerStatusAction(kubeSchedulerValue));
  }

  if (
    kubeControllerManager &&
    kubeControllerManager.data &&
    kubeControllerManager.data.status === 'success'
  ) {
    yield put(setKubeControllerManagerStatus(kubeControllerManagerValue));
  }

  if (
    apiServerValue.length > 1 &&
    parseInt(apiServerValue[1]) > 0 &&
    kubeSchedulerValue.length > 1 &&
    parseInt(kubeSchedulerValue[1]) > 0 &&
    kubeControllerManagerValue.length > 1 &&
    parseInt(kubeControllerManagerValue[1]) > 0
  ) {
    // There are a least one actif job for api-server, kube-scheduler and
    // kube-controller
    yield put(setClusterStatusAction(true));
  } else {
    yield put(setClusterStatusAction(false));
  }
}

export function* monitoringSaga() {
  yield takeEvery(FETCH_ALERTS, fetchAlerts);
  yield takeEvery(FETCH_CLUSTER_STATUS, fetchClusterStatus);
}
