import {
  call,
  put,
  takeEvery,
  takeLatest,
  select,
  delay,
} from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';

import { REFRESH_TIMEOUT } from '../../constants';

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

// Reducer

const defaultState = {
  list: [],
  nodes: [],
  volumes: [],
  isRefreshingHyperdrive: false,
  isNodesRefreshing: false,
  isVolumesRefreshing: false,
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

// Sagas

export function* fetchHyperdrive() {
  const results = yield call(ApiK8s.getHyperdrives);
  if (!results.error) {
    yield put(updateHyperdriveAction({ list: results?.body?.items ?? [] }));
  }
  return results;
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

export function* createHyperdrive({ payload }) {
  console.log('createHyperdrive');
  const body = {
    apiVersion: 'dataservice.scality.com/v1alpha1',
    kind: 'DataService',
    metadata: {
      name: 'hd2',
    },

    spec: {
      prometheus: {
        enable: false,
      },
      dataServers: {
        service: 'hd2',
        nodeName: 'node1',
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
        data: [{ hostPath: '/fake/data/path' }],
      },
    },
  };

  console.log('body', body);

  const result = yield call(ApiK8s.createHyperdrive, body);
  if (!result.error) {
    console.log('result', result);
    // yield call(createHyperdrive, `${environment}-example-solution`);
    // yield call(history.push, `/environments/${environment}`);
  }
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

export function* hyperdriveSaga() {
  yield takeEvery(REFRESH_HYPERDRIVE, refreshHyperdrive);
  yield takeEvery(STOP_REFRESH_HYPERDRIVE, stopRefreshHyperdrive);
  yield takeEvery(CREATE_HYPERDRIVE, createHyperdrive);
  yield takeLatest(REFRESH_VOLUMES, refreshVolumes);
  yield takeLatest(STOP_REFRESH_VOLUMES, stopRefreshVolumes);
  yield takeLatest(REFRESH_NODES, refreshNodes);
  yield takeLatest(STOP_REFRESH_NODES, stopRefreshNodes);
}
