import {
  takeLatest,
  call,
  put,
  delay,
  takeEvery,
  select
} from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
import {
  SPARCE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  REFRESH_TIMEOUT
} from '../../constants';
// Actions
const FETCH_VOLUMES = 'FETCH_VOLUMES';
const SET_VOLUMES = 'SET_VOLUMES';
const FETCH_PERSISTENT_VOLUMES = 'FETCH_PERSISTENT_VOLUMES';
const SET_PERSISTENT_VOLUMES = 'SET_PERSISTENT_VOLUMES';
const FETCH_STORAGECLASS = 'FETCH_STORAGECLASS';
const SET_STORAGECLASS = 'SET_STORAGECLASS';
const CREATE_VOLUMES = 'CREATE_VOLUMES';
const REFRESH_VOLUMES = 'REFRESH_VOLUMES';
const STOP_REFRESH_VOLUMES = 'STOP_REFRESH_VOLUMES';
const UPDATE_VOLUMES_REFRESHING = 'UPDATE_VOLUMES_REFRESHING';
const FETCH_PERSISTENT_VOLUME_CLAIMS = 'FETCH_PERSISTENT_VOLUME_CLAIMS';
const SET_PERSISTENT_VOLUME_CLAIMS = 'SET_PERSISTENT_VOLUME_CLAIMS';
// Reducer
const defaultState = {
  list: [],
  storageClass: [],
  pVList: [],
  isRefreshing: false,
  pVCList: []
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_VOLUMES:
      return { ...state, list: action.payload };
    case SET_PERSISTENT_VOLUMES:
      return { ...state, pVList: action.payload };
    case SET_STORAGECLASS:
      return { ...state, storageClass: action.payload };
    case UPDATE_VOLUMES_REFRESHING:
      return { ...state, isRefreshing: action.payload };
    case SET_PERSISTENT_VOLUME_CLAIMS:
      return { ...state, pVCList: action.payload };
    default:
      return state;
  }
}
// Action Creators
export const fetchVolumesAction = () => {
  return { type: FETCH_VOLUMES };
};

export const setVolumesAction = payload => {
  return { type: SET_VOLUMES, payload };
};

export const fetchPersistentVolumeAction = () => {
  return { type: FETCH_PERSISTENT_VOLUMES };
};

export const setPersistentVolumesAction = payload => {
  return { type: SET_PERSISTENT_VOLUMES, payload };
};

export const fetchPersistentVolumeClaimAction = () => {
  return { type: FETCH_PERSISTENT_VOLUME_CLAIMS };
};

export const setPersistentVolumeClaimAction = payload => {
  return { type: SET_PERSISTENT_VOLUME_CLAIMS, payload };
};

export const fetchStorageClassAction = () => {
  return { type: FETCH_STORAGECLASS };
};

export const setStorageClassAction = payload => {
  return { type: SET_STORAGECLASS, payload };
};

export const createVolumeAction = (newVolume, nodeName) => {
  return { type: CREATE_VOLUMES, payload: { newVolume, nodeName } };
};

export const refreshVolumesAction = () => {
  return { type: REFRESH_VOLUMES };
};

export const updateVolumesRefreshingAction = payload => {
  return { type: UPDATE_VOLUMES_REFRESHING, payload };
};

export const stopRefreshVolumesAction = () => {
  return { type: STOP_REFRESH_VOLUMES };
};
// Sagas
export function* fetchVolumes() {
  const result = yield call(ApiK8s.getVolumes);
  if (!result.error) {
    yield put(setVolumesAction(result.body.items));
  }
  return result;
}

export function* fetchPersistentVolumes() {
  const result = yield call(ApiK8s.getPersistentVolumes);
  if (!result.error) {
    yield put(setPersistentVolumesAction(result.body.items));
  }
}

export function* fetchStorageClass() {
  const result = yield call(ApiK8s.getStorageClass);
  if (!result.error) {
    yield put(setStorageClassAction(result.body.items));
  }
}

export function* createVolumes({ payload }) {
  const { newVolume, nodeName } = payload;

  const body = {
    apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
    kind: 'Volume',
    metadata: {
      name: newVolume.name
    },
    spec: {
      nodeName,
      storageClassName: newVolume.storageClass
    }
  };

  if (newVolume.type === SPARCE_LOOP_DEVICE) {
    body.spec.sparseLoopDevice = { size: newVolume.size };
  }
  if (newVolume.type === RAW_BLOCK_DEVICE) {
    body.spec.rawBlockDevice = { devicePath: newVolume.path };
  }
  const result = yield call(ApiK8s.createVolume, body);
  if (!result.error) {
    yield call(history.push, `/nodes/${nodeName}/volumes`);
  }
}

export function* refreshVolumes() {
  yield put(updateVolumesRefreshingAction(true));
  const result = yield call(fetchVolumes);
  if (!result.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(state => state.app.volumes.isRefreshing);
    if (isRefreshing) {
      yield call(refreshVolumes);
    }
  }
}

export function* stopRefreshVolumes() {
  yield put(updateVolumesRefreshingAction(false));
}

export function* fetchPersistentVolumeClaims() {
  const result = yield call(ApiK8s.getPersistentVolumeClaims);
  if (!result.error) {
    yield put(setPersistentVolumeClaimAction(result.body.items));
  }
}

export function* volumesSaga() {
  yield takeLatest(FETCH_VOLUMES, fetchVolumes);
  yield takeLatest(FETCH_STORAGECLASS, fetchStorageClass);
  yield takeLatest(CREATE_VOLUMES, createVolumes);
  yield takeLatest(FETCH_PERSISTENT_VOLUMES, fetchPersistentVolumes);
  yield takeEvery(REFRESH_VOLUMES, refreshVolumes);
  yield takeEvery(STOP_REFRESH_VOLUMES, stopRefreshVolumes);
  yield takeEvery(FETCH_PERSISTENT_VOLUME_CLAIMS, fetchPersistentVolumeClaims);
}
