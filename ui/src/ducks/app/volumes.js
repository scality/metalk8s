import { takeLatest, call, put } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
// Actions
const FETCH_VOLUMES = 'FETCH_VOLUMES';
const SET_VOLUMES = 'SET_VOLUMES';
const FETCH_PERSISTENT_VOLUMES = 'FETCH_PERSISTENT_VOLUMES';
const SET_PERSISTENT_VOLUMES = 'SET_PERSISTENT_VOLUMES';
const FETCH_STORAGECLASS = 'FETCH_STORAGECLASS';
const SET_STORAGECLASS = 'SET_STORAGECLASS';
const CREATE_VOLUMES = 'CREATE_VOLUMES';
// Reducer
const defaultState = { list: [], storageClass: [], pVList: [] };

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_VOLUMES:
      return { ...state, list: action.payload };
    case SET_PERSISTENT_VOLUMES:
      return { ...state, pVList: action.payload };
    case SET_STORAGECLASS:
      return { ...state, storageClass: action.payload };
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

export const fetchStorageClassAction = () => {
  return { type: FETCH_STORAGECLASS };
};

export const setStorageClassAction = payload => {
  return { type: SET_STORAGECLASS, payload };
};

export const createVolumeAction = (newVolume, nodeName) => {
  return { type: CREATE_VOLUMES, payload: { newVolume, nodeName } };
};

// Sagas
export function* fetchVolumes() {
  const result = yield call(ApiK8s.getVolumes);
  yield put(setVolumesAction(result.body.items));
}

export function* fetchPersistentVolumes() {
  const result = yield call(ApiK8s.getPersistentVolumes);
  yield put(setPersistentVolumesAction(result.body.items));
}

export function* fetchStorageClass() {
  const result = yield call(ApiK8s.getStorageClass);
  yield put(setStorageClassAction(result.body.items));
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

  if (newVolume.type === 'sparseLoopDevice') {
    body.spec.sparseLoopDevice = { size: newVolume.size };
  }
  if (newVolume.type === 'rawBlockDevice') {
    body.spec.rawBlockDevice = { devicePath: newVolume.path };
  }
  const result = yield call(ApiK8s.createVolume, body);
  if (!result.error) {
    yield call(history.push, `/nodes/${nodeName}/volumes`);
  }
}

export function* volumesSaga() {
  yield takeLatest(FETCH_VOLUMES, fetchVolumes);
  yield takeLatest(FETCH_STORAGECLASS, fetchStorageClass);
  yield takeLatest(CREATE_VOLUMES, createVolumes);
  yield takeLatest(FETCH_PERSISTENT_VOLUMES, fetchPersistentVolumes);
}
