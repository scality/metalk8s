import { takeLatest, call, put, delay, select } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
import { intl } from '../../translations/IntlGlobalProvider';
import {
  addNotificationErrorAction,
  addNotificationSuccessAction,
} from './notifications';
import {
  SPARSE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  REFRESH_TIMEOUT,
} from '../../constants';

// Actions
const FETCH_VOLUMES = 'FETCH_VOLUMES';
const SET_VOLUMES = 'SET_VOLUMES';
const DELETE_VOLUME = 'DELETE_VOLUME';
const FETCH_PERSISTENT_VOLUMES = 'FETCH_PERSISTENT_VOLUMES';
const SET_PERSISTENT_VOLUMES = 'SET_PERSISTENT_VOLUMES';
const FETCH_STORAGECLASS = 'FETCH_STORAGECLASS';
export const SET_STORAGECLASS = 'SET_STORAGECLASS';
const UPDATE_STORAGECLASS = 'UPDATE_STORAGECLASS';
const CREATE_VOLUMES = 'CREATE_VOLUMES';
const REFRESH_VOLUMES = 'REFRESH_VOLUMES';
const STOP_REFRESH_VOLUMES = 'STOP_REFRESH_VOLUMES';
const UPDATE_VOLUMES_REFRESHING = 'UPDATE_VOLUMES_REFRESHING';
const FETCH_PERSISTENT_VOLUME_CLAIMS = 'FETCH_PERSISTENT_VOLUME_CLAIMS';
const SET_PERSISTENT_VOLUME_CLAIMS = 'SET_PERSISTENT_VOLUME_CLAIMS';
const REFRESH_PERSISTENT_VOLUMES = 'REFRESH_PERSISTENT_VOLUMES';
const STOP_REFRESH_PERSISTENT_VOLUMES = 'STOP_REFRESH_PERSISTENT_VOLUMES';
const UPDATE_PERSISTENT_VOLUMES_REFRESHING =
  'UPDATE_PERSISTENT_VOLUMES_REFRESHING';
const UPDATE_VOLUMES = 'UPDATE_VOLUMES';

// Reducer
const defaultState = {
  list: [],
  storageClass: [],
  pVList: [],
  isRefreshing: false,
  pVCList: [],
  isPVRefreshing: false,
  isLoading: false,
  isSCLoading: false,
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
    case UPDATE_PERSISTENT_VOLUMES_REFRESHING: {
      return { ...state, isPVRefreshing: action.payload };
    }
    case UPDATE_VOLUMES: {
      return { ...state, ...action.payload };
    }
    case UPDATE_STORAGECLASS: {
      return { ...state, isSCLoading: action.payload };
    }
    default:
      return state;
  }
}
// Action Creators
export const fetchVolumesAction = () => {
  return { type: FETCH_VOLUMES };
};

export const setVolumesAction = (payload) => {
  return { type: SET_VOLUMES, payload };
};

export const deleteVolumeAction = (payload) => {
  return { type: DELETE_VOLUME, payload };
};

export const fetchPersistentVolumeAction = () => {
  return { type: FETCH_PERSISTENT_VOLUMES };
};

export const setPersistentVolumesAction = (payload) => {
  return { type: SET_PERSISTENT_VOLUMES, payload };
};

export const fetchPersistentVolumeClaimAction = () => {
  return { type: FETCH_PERSISTENT_VOLUME_CLAIMS };
};

export const setPersistentVolumeClaimAction = (payload) => {
  return { type: SET_PERSISTENT_VOLUME_CLAIMS, payload };
};

export const fetchStorageClassAction = () => {
  return { type: FETCH_STORAGECLASS };
};

export const setStorageClassAction = (payload) => {
  return { type: SET_STORAGECLASS, payload };
};

export const updateStorageClassAction = (payload) => {
  return { type: UPDATE_STORAGECLASS, payload };
};

export const createVolumeAction = (newVolume, nodeName) => {
  return { type: CREATE_VOLUMES, payload: { newVolume, nodeName } };
};

export const refreshVolumesAction = () => {
  return { type: REFRESH_VOLUMES };
};

export const updateVolumesRefreshingAction = (payload) => {
  return { type: UPDATE_VOLUMES_REFRESHING, payload };
};

export const stopRefreshVolumesAction = () => {
  return { type: STOP_REFRESH_VOLUMES };
};

export const refreshPersistentVolumesAction = () => {
  return { type: REFRESH_PERSISTENT_VOLUMES };
};

export const updatePersistentVolumesRefreshingAction = (payload) => {
  return { type: UPDATE_PERSISTENT_VOLUMES_REFRESHING, payload };
};

export const stopRefreshPersistentVolumesAction = () => {
  return { type: STOP_REFRESH_PERSISTENT_VOLUMES };
};

export const updateVolumesAction = (payload) => {
  return { type: UPDATE_VOLUMES, payload };
};

// Selectors
export const volumesRefreshingSelector = (state) =>
  state.app.volumes.isRefreshing;
export const persistentVolumesRefreshingSelector = (state) =>
  state.app.volumes.isPVRefreshing;

// Sagas
export function* fetchVolumes() {
  yield put(
    updateVolumesAction({
      isLoading: true,
    }),
  );
  const result = yield call(ApiK8s.getVolumes);
  if (!result.error) {
    yield put(setVolumesAction(result?.body?.items ?? []));
  }
  yield delay(1000); // To make sure that the loader is visible for at least 1s
  yield put(
    updateVolumesAction({
      isLoading: false,
    }),
  );
  return result;
}

export function* fetchPersistentVolumes() {
  const result = yield call(ApiK8s.getPersistentVolumes);
  if (!result.error) {
    yield put(setPersistentVolumesAction(result?.body?.items ?? []));
  }
  return result;
}

export function* fetchStorageClass() {
  yield put(updateStorageClassAction(true));
  const result = yield call(ApiK8s.getStorageClass);
  if (!result.error) {
    yield put(setStorageClassAction(result?.body?.items ?? []));
  }
  yield put(updateStorageClassAction(false));
}

/**
 * This function construct the body that is needed to create a volume.
 * Then it calls K8s API to create it.
 *
 * @param {object} newVolume - fields of the createVolume form
 * @param {string} nodeName
 *
 * More examples in volumes.test.js
 * @example
 *
 * const action = {
 *  payload: {
 *    newVolume: {
 *      name: 'volume1',
 *      storageClass: 'metalk8s-default',
 *      type: 'sparseLoopDevice',
 *      size: '1Gi'
 *    },
 *    nodeName: 'bootstrap'
 *  }
 * };
 *
 * createVolumes(action)
 */
export function* createVolumes({ payload }) {
  const { newVolume, nodeName } = payload;

  const body = {
    apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
    kind: 'Volume',
    metadata: {
      name: newVolume.name,
      labels: newVolume.labels,
    },
    spec: {
      nodeName,
      storageClassName: newVolume.storageClass,
      template: {
        metadata: {
          labels: newVolume.labels,
        },
      },
    },
  };

  /**
   * Size should be set for SPARSE_LOOP_DEVICE
   * Path should be set for RAW_BLOCK_DEVICE
   */
  let isNewVolumeValid =
    newVolume &&
    newVolume.name &&
    newVolume.storageClass &&
    ((newVolume.type === SPARSE_LOOP_DEVICE && newVolume.size) ||
      (newVolume.type === RAW_BLOCK_DEVICE && newVolume.path));

  if (isNewVolumeValid && nodeName) {
    if (newVolume.type === SPARSE_LOOP_DEVICE) {
      body.spec.sparseLoopDevice = { size: newVolume.size };
    } else {
      body.spec.rawBlockDevice = { devicePath: newVolume.path };
    }

    const result = yield call(ApiK8s.createVolume, body);
    if (!result.error) {
      yield call(
        history.push,
        `/volumes/?node=${nodeName}&volume=${newVolume.name}`,
      );
      yield put(
        addNotificationSuccessAction({
          title: intl.translate('volume_creation'),
          message: intl.translate('volume_creation_success', {
            name: newVolume.name,
          }),
        }),
      );
    } else {
      yield put(
        addNotificationErrorAction({
          title: intl.translate('volume_creation'),
          message: intl.translate('volume_creation_failed', {
            name: newVolume.name,
          }),
        }),
      );
    }
  } else {
    // We might want to change this behavior later
    yield put(
      addNotificationErrorAction({
        title: 'Volume Form Error',
        message: 'Volume not created, some fields are missing.',
      }),
    );
  }
}

export function* refreshVolumes() {
  yield put(updateVolumesRefreshingAction(true));
  const result = yield call(fetchVolumes);
  if (!result.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(volumesRefreshingSelector);
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

export function* refreshPersistentVolumes() {
  yield put(updatePersistentVolumesRefreshingAction(true));
  const result = yield call(fetchPersistentVolumes);
  if (!result.error) {
    yield delay(REFRESH_TIMEOUT);
    const isPVRefreshing = yield select(persistentVolumesRefreshingSelector);
    if (isPVRefreshing) {
      yield call(refreshPersistentVolumes);
    }
  }
}

export function* stopRefreshPersistentVolumes() {
  yield put(updatePersistentVolumesRefreshingAction(false));
}

export function* deleteVolume({ payload }) {
  const result = yield call(ApiK8s.deleteVolume, payload);
  if (!result.error) {
    yield put(
      addNotificationSuccessAction({
        title: intl.translate('volume_deletion'),
        message: intl.translate('volume_delete_success', {
          name: payload,
        }),
      }),
    );
  } else {
    yield put(
      addNotificationErrorAction({
        title: intl.translate('volume_deletion'),
        message: intl.translate('volume_delete_failed', {
          name: payload,
        }),
      }),
    );
  }
  yield call(fetchVolumes);
}

export function* volumesSaga() {
  yield takeLatest(FETCH_VOLUMES, fetchVolumes);
  yield takeLatest(FETCH_STORAGECLASS, fetchStorageClass);
  yield takeLatest(CREATE_VOLUMES, createVolumes);
  yield takeLatest(DELETE_VOLUME, deleteVolume);
  yield takeLatest(FETCH_PERSISTENT_VOLUMES, fetchPersistentVolumes);
  yield takeLatest(REFRESH_VOLUMES, refreshVolumes);
  yield takeLatest(STOP_REFRESH_VOLUMES, stopRefreshVolumes);
  yield takeLatest(FETCH_PERSISTENT_VOLUME_CLAIMS, fetchPersistentVolumeClaims);
  yield takeLatest(REFRESH_PERSISTENT_VOLUMES, refreshPersistentVolumes);
  yield takeLatest(
    STOP_REFRESH_PERSISTENT_VOLUMES,
    stopRefreshPersistentVolumes,
  );
}
