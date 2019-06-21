import { put, takeEvery, select, call } from 'redux-saga/effects';
import { getAlerts, queryPrometheus } from '../../services/prometheus/api';

const FETCH_ALERTS = 'FETCH_ALERTS';
const SET_ALERTS = 'SET_ALERTS';

const FETCH_CLUSTER_STATUS = 'FETCH_CLUSTER_STATUS';
const SET_CLUSTER_STATUS = 'SET_CLUSTER_STATUS';
const SET_APISERVER_STATUS = 'SET_APISERVER_STATUS';
const SET_KUBESCHEDULER_STATUS = 'SET_KUBESCHEDULER_STATUS';
const SET_KUBECONTROLLER_MANAGER_STATUS = 'SET_KUBECONTROLLER_MANAGER_STATUS';

const defaultState = {
  alertList: [],
  clusterStatus: [],

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

  const apiserver = yield call(
    queryPrometheus,
    api.url_prometheus,
    apiserverQuery
  );
  const apiServerValue = apiserver.data.data.result[0].value;

  const kubeScheduler = yield call(
    queryPrometheus,
    api.url_prometheus,
    kubeSchedulerQuery
  );
  const kubeSchedulerValue = kubeScheduler.data.data.result[0].value;

  const kubeControllerManager = yield call(
    queryPrometheus,
    api.url_prometheus,
    kubeControllerManagerQuery
  );
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
    apiServerValue.length > 0 &&
    kubeSchedulerValue.length > 0 &&
    kubeControllerManagerValue.length > 0
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
