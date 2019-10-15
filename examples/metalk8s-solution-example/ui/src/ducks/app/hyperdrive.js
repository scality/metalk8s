import {
  call,
  put,
  takeEvery,
  takeLatest,
  select,
  delay,
} from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';

import { REFRESH_TIMEOUT, OPERATOR_NAMESPACE } from '../../constants';

// Actions

const REFRESH_HYPERDRIVE = 'REFRESH_HYPERDRIVE';
const STOP_REFRESH_HYPERDRIVE = 'STOP_REFRESH_HYPERDRIVE';
const UPDATE_HYPERDRIVE = 'UPDATE_HYPERDRIVE';
const CREATE_HYPERDRIVE = 'CREATE_HYPERDRIVE';

const REFRESH_VOLUMES = 'REFRESH_VOLUMES';
const STOP_REFRESH_VOLUMES = 'STOP_REFRESH_VOLUMES';
const SET_VOLUMES = 'SET_VOLUMES';
const SET_VOLUMES_REFRESHING = 'SET_VOLUMES_REFRESHING';

const SET_NODES_REFRESHING = 'SET_NODES_REFRESHING';
const REFRESH_NODES = 'REFRESH_NODES';
const STOP_REFRESH_NODES = 'STOP_REFRESH_NODES';

const CREATE_HYPERDRIVE_CONTROLLER = 'CREATE_HYPERDRIVE_CONTROLLER';
const START_POLLING_HYPERDRIVE_CONTROLLER =
  'START_POLLING_HYPERDRIVE_CONTROLLER';
const STOP_POLLING_HYPERDRIVE_CONTROLLER = 'STOP_POLLING_HYPERDRIVE_CONTROLLER';
const SET_HYPERDRIVE_CONTROLLER = 'SET_HYPERDRIVE_CONTROLLER';
const SET_HYPERDRIVE_CONTROLLER_REFRESHING =
  'SET_HYPERDRIVE_CONTROLLER_REFRESHING';

// Reducer

const defaultState = {
  list: [],
  hyperdriveControllers: [],
  nodes: [],
  volumes: [],
  isRefreshingHyperdrive: false,
  isNodesRefreshing: false,
  isVolumesRefreshing: false,
  isHyperdriveControllerRefreshing: false,
  isHyperdriveControllerPolling: false,
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE_HYPERDRIVE:
      return { ...state, ...action.payload };
    case SET_VOLUMES_REFRESHING:
      return { ...state, isVolumesRefreshing: action.payload };
    case SET_NODES_REFRESHING:
      return { ...state, isNodesRefreshing: action.payload };
    case SET_VOLUMES:
      return { ...state, volumes: action.payload };
    case SET_HYPERDRIVE_CONTROLLER:
      return { ...state, hyperdriveControllers: action.payload };
    case SET_HYPERDRIVE_CONTROLLER_REFRESHING:
      return { ...state, isHyperdriveControllerRefreshing: action.payload };
    default:
      return state;
  }
}

// Action Creators

export const refreshHyperdriveAction = environment => {
  return { type: REFRESH_HYPERDRIVE, environment };
};
export const stopRefreshHyperdriveAction = () => {
  return { type: STOP_REFRESH_HYPERDRIVE };
};
// FIXME it's harder to understand what happen
export const updateHyperdriveAction = payload => {
  return { type: UPDATE_HYPERDRIVE, payload };
};

export const createHyperdriveAction = newHyperdrive => {
  return { type: CREATE_HYPERDRIVE, payload: newHyperdrive };
};

const setVolumesAction = payload => {
  return { type: SET_VOLUMES, payload };
};

const setVolumesRefreshingAction = payload => {
  return { type: SET_VOLUMES_REFRESHING, payload };
};

export const refreshVolumesAction = () => {
  return { type: REFRESH_VOLUMES };
};
export const stopRefreshVolumesAction = () => {
  return { type: STOP_REFRESH_VOLUMES };
};

export const setNodesRefreshingAction = payload => {
  return { type: SET_NODES_REFRESHING, payload };
};

export const refreshNodesAction = () => {
  return { type: REFRESH_NODES };
};
export const stopRefreshNodesAction = () => {
  return { type: STOP_REFRESH_NODES };
};

export const createHyperdriveControllerAction = newHyperdriveController => {
  return {
    type: CREATE_HYPERDRIVE_CONTROLLER,
    payload: newHyperdriveController,
  };
};

export const setHyperdriveControllerAction = payload => {
  return { type: SET_HYPERDRIVE_CONTROLLER, payload };
};

export const setHyperdriveControllerPollingAction = payload => {
  return { type: SET_HYPERDRIVE_CONTROLLER_REFRESHING, payload };
};

export const startPollingHyperdriveControllerAction = () => {
  return { type: START_POLLING_HYPERDRIVE_CONTROLLER };
};

export const stopPollingHyperdriveControllerAction = () => {
  return { type: STOP_POLLING_HYPERDRIVE_CONTROLLER };
};

// Sagas

export function* fetchHyperdrive() {
  const results = yield call(ApiK8s.getHyperdrives);
  if (!results.error) {
    yield put(updateHyperdriveAction({ list: results?.body?.items ?? [] }));
  }
  return results;
}

export function* createHyperdrive({ payload }) {
  const { name, nodeName, dataVolumes, environment } = payload;
  const namespace = `${environment}-${OPERATOR_NAMESPACE}`;

  /**
   * FIXME The body is not stable
   * Some fields will be replace or delete
   */
  const body = {
    apiVersion: 'dataservice.scality.com/v1alpha1',
    kind: 'DataService',
    metadata: {
      name: name,
    },
    spec: {
      prometheus: {
        enable: false,
      },
      dataServers: {
        service: name,
        nodeName: nodeName,
        image: {
          repository: 'localhost:32000',
          name: 'hyperiod',
          tag: '0.2.0',
          pullPolicy: 'IfNotPresent',
        },
        params: {
          nrdata: '2',
          nrcoding: '1',
          extent_total_size: '16777216',
        },
        index: { hostPath: '/fake/index/path' },
        data: dataVolumes.map(() => ({ hostPath: '/fake/data/path' })),
      },
    },
  };

  const result = yield call(ApiK8s.createHyperdrive, body, namespace);
  if (!result.error) {
    yield call(history.push, `/environments/${environment}`);
  }
}

export function* refreshHyperdrive({ environment }) {
  yield put(
    updateHyperdriveAction({
      isRefreshingHyperdrive: true,
    }),
  );

  const results = yield call(fetchHyperdrive);
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.hyperdrive.isRefreshingHyperdrive,
    );
    if (isRefreshing) {
      yield call(refreshHyperdrive, { environment });
    }
  }
}

export function* stopRefreshHyperdrive() {
  yield put(
    updateHyperdriveAction({
      isRefreshingHyperdrive: false,
    }),
  );
}

export function* fetchNodes() {
  yield put(
    updateHyperdriveAction({
      isNodesLoading: true,
    }),
  );
  const result = yield call(ApiK8s.getNodes);
  if (!result.error) {
    yield put(updateHyperdriveAction({ nodes: result?.body?.items ?? [] }));
  }
  yield delay(1000); // To make sur that the loader is visible for at least 1s
  yield put(
    updateHyperdriveAction({
      isNodesLoading: false,
    }),
  );
  return result;
}

export function* refreshNodes() {
  yield put(setNodesRefreshingAction(true));

  const result = yield call(fetchNodes);
  if (!result.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.hyperdrive.isNodesRefreshing,
    );
    if (isRefreshing) {
      yield call(refreshNodes);
    }
  }
}

export function* stopRefreshNodes() {
  yield put(setNodesRefreshingAction(false));
}

export function* fetchVolumes() {
  const result = yield call(ApiK8s.getVolumes);
  if (!result.error) {
    yield put(setVolumesAction(result?.body?.items ?? []));
  }
  return result;
}

export function* refreshVolumes() {
  yield put(setVolumesRefreshingAction(true));
  const result = yield call(fetchVolumes);
  if (!result.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.hyperdrive.isVolumesRefreshing,
    );
    if (isRefreshing) {
      yield call(refreshVolumes);
    }
  }
}

export function* stopRefreshVolumes() {
  yield put(setVolumesRefreshingAction(false));
}

export function* fetchHyperdriveController() {
  const result = yield call(ApiK8s.getHyperdriveControllers);
  if (!result.error) {
    yield put(setHyperdriveControllerAction(result?.body?.items ?? []));
  }
  return result;
}

export function* startPollingHyperdriveController({ environment }) {
  yield put(setHyperdriveControllerPollingAction(true));
  const result = yield call(fetchHyperdriveController);
  if (!result.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.hyperdrive.isHyperdriveControllerRefreshing,
    );
    if (isRefreshing) {
      yield call(startPollingHyperdriveController, { environment });
    }
  }
}

export function* stopPollingHyperdriveController() {
  yield put(setHyperdriveControllerPollingAction(false));
}

export function* createHyperdriveController({ payload }) {
  const { name, environment, protections, hyperdrives } = payload;
  const namespace = `${environment}-${OPERATOR_NAMESPACE}`;

  const protection = protections.map(p => ({
    schema: { ...p.payload, splitsize: 1000000 },
  }));

  const endpoints = hyperdrives.map(hd => ({ serviceName: hd.value }));

  const body = {
    apiVersion: 'hd.scality.com/v1alpha1',
    kind: 'HdService',
    metadata: {
      name: name,
    },
    spec: {
      replicas: { proxy: 1 },
      prometheus: { enable: false },
      repair: {
        type: 'kafka',
        brokers: ['my-kafka-headless:9092'],
        topic: 'repair',
        partition: 1,
        replica: 1,
      },
      protection,
      endpoints,
    },
  };

  const result = yield call(ApiK8s.createHyperdriveController, body, namespace);
  if (!result.error) {
    yield call(history.push, `/environments/${environment}`);
  }
}

export function* hyperdriveSaga() {
  yield takeEvery(REFRESH_HYPERDRIVE, refreshHyperdrive);
  yield takeEvery(STOP_REFRESH_HYPERDRIVE, stopRefreshHyperdrive);
  yield takeEvery(CREATE_HYPERDRIVE, createHyperdrive);
  yield takeLatest(REFRESH_VOLUMES, refreshVolumes);
  yield takeLatest(STOP_REFRESH_VOLUMES, stopRefreshVolumes);
  yield takeLatest(REFRESH_NODES, refreshNodes);
  yield takeLatest(STOP_REFRESH_NODES, stopRefreshNodes);
  yield takeEvery(CREATE_HYPERDRIVE_CONTROLLER, createHyperdriveController);
  yield takeLatest(
    START_POLLING_HYPERDRIVE_CONTROLLER,
    startPollingHyperdriveController,
  );
  yield takeLatest(
    STOP_POLLING_HYPERDRIVE_CONTROLLER,
    stopPollingHyperdriveController,
  );
}
