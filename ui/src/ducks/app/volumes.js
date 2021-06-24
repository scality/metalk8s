//@flow
import {
  Effect,
  takeLatest,
  call,
  put,
  delay,
  select,
} from 'redux-saga/effects';
import type { RootState } from '../reducer';
import * as VolumesApi from '../../services/k8s/volumes';
import * as Metalk8sVolumesApi from '../../services/k8s/Metalk8sVolumeClient.generated';
import {
  addNotificationErrorAction,
  addNotificationSuccessAction,
} from './notifications';
import {
  SPARSE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  REFRESH_TIMEOUT,
  LVM_LOGICAL_VOLUME,
} from '../../constants';

import type { Metalk8sV1alpha1Volume } from '../../services/k8s/Metalk8sVolumeClient.generated';
import {
  V1PersistentVolume,
  V1PersistentVolumeClaim,
  V1PersistentVolumeClaimList,
  V1PersistentVolumeList,
  V1StorageClass,
  V1StorageClassList,
} from '@kubernetes/client-node/dist/gen/model/models';

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
const FETCH_CURRENT_VOLUME_OBJECT = 'FETCH_CURRENT_VOLUME_OBJECT';
const SET_CURRENT_VOLUME_OBJECT = 'SET_CURRENT_VOLUME_OBJECT';

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
  currentVolumeObject: {
    data: null,
  },
};

export type VolumesState = {
  list: Metalk8sV1alpha1Volume[],
  storageClass: V1StorageClass[],
  pVList: V1PersistentVolume[],
  isRefreshing: boolean,
  pVCList: V1PersistentVolumeClaim[],
  isPVRefreshing: boolean,
  isLoading: boolean,
  isSCLoading: boolean,
  currentVolumeObject: {
    data: ?Metalk8sV1alpha1Volume,
  },
};

export default function reducer(
  state: VolumesState = defaultState,
  action: any = {},
): VolumesState {
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
    case SET_CURRENT_VOLUME_OBJECT:
      return { ...state, currentVolumeObject: action.payload };
    default:
      return state;
  }
}
// Action Creators
export const fetchVolumesAction = () => {
  return { type: FETCH_VOLUMES };
};

export const setVolumesAction = (payload: Metalk8sV1alpha1Volume[]) => {
  return { type: SET_VOLUMES, payload };
};

export const deleteVolumeAction = (payload: any) => {
  return { type: DELETE_VOLUME, payload };
};

export const fetchPersistentVolumeAction = () => {
  return { type: FETCH_PERSISTENT_VOLUMES };
};

export const setPersistentVolumesAction = (payload: V1PersistentVolume[]) => {
  return { type: SET_PERSISTENT_VOLUMES, payload };
};

export const fetchPersistentVolumeClaimAction = () => {
  return { type: FETCH_PERSISTENT_VOLUME_CLAIMS };
};

export const setPersistentVolumeClaimAction = (
  payload: V1PersistentVolumeClaim[],
) => {
  return { type: SET_PERSISTENT_VOLUME_CLAIMS, payload };
};

export const fetchStorageClassAction = () => {
  return { type: FETCH_STORAGECLASS };
};

export const setStorageClassAction = (payload: V1StorageClass[]) => {
  return { type: SET_STORAGECLASS, payload };
};

export const updateStorageClassAction = (payload: boolean) => {
  return { type: UPDATE_STORAGECLASS, payload };
};

export const createVolumesAction = (newVolumes: {
  payload: { newVolumes: Volume[] },
}) => {
  return { type: CREATE_VOLUMES, payload: { newVolumes } };
};

export const refreshVolumesAction = () => {
  return { type: REFRESH_VOLUMES };
};

export const updateVolumesRefreshingAction = (payload: boolean) => {
  return { type: UPDATE_VOLUMES_REFRESHING, payload };
};

export const stopRefreshVolumesAction = () => {
  return { type: STOP_REFRESH_VOLUMES };
};

export const refreshPersistentVolumesAction = () => {
  return { type: REFRESH_PERSISTENT_VOLUMES };
};

export const updatePersistentVolumesRefreshingAction = (payload: boolean) => {
  return { type: UPDATE_PERSISTENT_VOLUMES_REFRESHING, payload };
};

export const stopRefreshPersistentVolumesAction = () => {
  return { type: STOP_REFRESH_PERSISTENT_VOLUMES };
};

export const updateVolumesAction = (payload: any) => {
  return { type: UPDATE_VOLUMES, payload };
};

export const fetchCurrentVolumeObjectAction = (volumeName: string) => {
  return { type: FETCH_CURRENT_VOLUME_OBJECT, volumeName };
};

export const setCurrentVolumeObjectAction = (payload: {
  data: ?Metalk8sV1alpha1Volume,
}) => {
  return { type: SET_CURRENT_VOLUME_OBJECT, payload };
};

// Selectors
export const volumesRefreshingSelector = (state: any): boolean =>
  state.app.volumes.isRefreshing;
export const persistentVolumesRefreshingSelector = (state: any): boolean =>
  state.app.volumes.isPVRefreshing;
const intlSelector = (state: RootState) => state.config.intl;

// Sagas
export function* fetchVolumes(): Generator<
  Effect,
  | {
      body: { items: Metalk8sV1alpha1Volume[] },
    }
  | { error: any, body: null },
  | {
      body: { items: Metalk8sV1alpha1Volume[] },
    }
  | { error: any, body: null },
> {
  yield put(
    updateVolumesAction({
      isLoading: true,
    }),
  );
  const result = yield call(Metalk8sVolumesApi.getMetalk8sV1alpha1VolumeList);
  if (result.body) {
    yield put(setVolumesAction(result.body.items ?? []));
  }
  yield delay(1000); // To make sure that the loader is visible for at least 1s
  yield put(
    updateVolumesAction({
      isLoading: false,
    }),
  );
  return result;
}

export function* fetchPersistentVolumes(): Generator<
  Effect,
  | {
      body: V1PersistentVolumeList,
    }
  | { error: any, body: null },
  | {
      body: V1PersistentVolumeList,
    }
  | { error: any, body: null },
> {
  const result = yield call(VolumesApi.getPersistentVolumes);
  if (!result.error) {
    yield put(setPersistentVolumesAction(result.body.items ?? []));
  }
  return result;
}

export function* fetchStorageClass(): Generator<
  Effect,
  void,
  | {
      body: V1StorageClassList,
    }
  | { error: any, body: null },
> {
  yield put(updateStorageClassAction(true));
  const result = yield call(VolumesApi.getStorageClass);
  if (result.body) {
    yield put(setStorageClassAction(result.body.items ?? []));
  }
  yield put(updateStorageClassAction(false));
}

type Volume = {
  name: string,
  node: string,
  storageClass: string,
  type: string, // TODO we might want to constraint it to 'sparseLoopDevice' | 'rawBlockDevice' | 'lvmLogicalVolume'
  size: string,
  vgName: string,
  labels: { [key: string]: string },
  path: string,
};

/**
 * This function construct the body that is needed to create a volume.
 * Then it calls K8s API to create it.
 *
 * @param {array} newVolume - The array of fields of the createVolume form
 * @param {string} nodeName
 *
 * More examples in volumes.test.js
 * @example
 *
 * const action = {
 *  payload: {
 *    newVolume: [{
 *      name: 'volume1',
 *      node: 'bootrap',
 *      storageClass: 'metalk8s-default',
 *      type: 'sparseLoopDevice',
 *      size: '1Gi'
 *    }],
 *  }
 * };
 *
 * createVolumes(action)
 */
export function* createVolumes({
  payload,
}: {
  payload: {
    newVolumes: Volume[],
  },
}): Generator<
  Effect,
  void,
  | {
      body: Metalk8sV1alpha1Volume,
    }
  | { error: any, body: null },
> {
  const { newVolumes } = payload;

  for (var i = 0; i < newVolumes.length; i++) {
    const body: Metalk8sV1alpha1Volume = {
      apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
      kind: 'Volume',
      metadata: {
        name: newVolumes[i].name,
        labels: newVolumes[i].labels,
      },
      spec: {
        nodeName: newVolumes[i].node,
        storageClassName: newVolumes[i].storageClass,
        template: {
          metadata: {
            labels: newVolumes[i].labels,
          },
        },
      },
    };
    /**
     * Size should be set for SPARSE_LOOP_DEVICE
     * Path should be set for RAW_BLOCK_DEVICE
     * Size and vgName should be set for LVM_LOGICAL_VOLUME
     */
    let isNewVolumeValid =
      newVolumes[i] &&
      newVolumes[i].name &&
      newVolumes[i].storageClass &&
      ((newVolumes[i].type === SPARSE_LOOP_DEVICE && newVolumes[i].size) ||
        (newVolumes[i].type === RAW_BLOCK_DEVICE && newVolumes[i].path) ||
        (newVolumes[i].type === LVM_LOGICAL_VOLUME &&
          newVolumes[i].size &&
          newVolumes[i].vgName));

    if (isNewVolumeValid) {
      if (newVolumes[i].type === SPARSE_LOOP_DEVICE) {
        body.spec = {
          ...body.spec,
          sparseLoopDevice: { size: newVolumes[i].size },
        };
      } else if (newVolumes[i].type === RAW_BLOCK_DEVICE) {
        body.spec = {
          ...body.spec,
          rawBlockDevice: { devicePath: newVolumes[i].path },
        };
      } else if (newVolumes[i].type === LVM_LOGICAL_VOLUME) {
        body.spec = {
          ...body.spec,
          lvmLogicalVolume: {
            size: newVolumes[i].size,
            vgName: newVolumes[i].vgName,
          },
        };
      }

      const result = yield call(
        Metalk8sVolumesApi.createMetalk8sV1alpha1Volume,
        body,
      );
      const intl = yield select(intlSelector);

      if (!result.error) {
        const { history } = yield select((state: RootState) => state.history);
        yield call(
          history.push,
          `/volumes/${newVolumes[i].name}/overview?node=${newVolumes[i].node}`,
        );
        yield put(
          addNotificationSuccessAction({
            title: intl.formatMessage({ id: 'volume_creation' }),
            message: intl.formatMessage(
              { id: 'volume_creation_success' },
              {
                name: newVolumes[i].name,
              },
            ),
          }),
        );
      } else {
        yield put(
          addNotificationErrorAction({
            title: intl.formatMessage({ id: 'volume_creation' }),
            message: intl.formatMessage(
              { id: 'volume_creation_failed' },
              {
                name: newVolumes[i].name,
              },
            ),
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
}

export function* refreshVolumes(): Generator<
  Effect,
  void,
  | {
      body: Metalk8sV1alpha1Volume,
    }
  | { error: any, body: null },
> {
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

export function* stopRefreshVolumes(): Generator<Effect, void, boolean> {
  yield put(updateVolumesRefreshingAction(false));
}

export function* fetchPersistentVolumeClaims(): Generator<
  Effect,
  void,
  | {
      body: V1PersistentVolumeClaimList,
    }
  | { error: any, body: null },
> {
  const result = yield call(VolumesApi.getPersistentVolumeClaims);
  if (!result.error) {
    yield put(setPersistentVolumeClaimAction(result.body.items));
  }
}

export function* fetchCurrentVolumeObject({
  volumeName,
}: {
  volumeName: string,
}): Generator<
  Effect,
  void,
  | {
      body: Metalk8sV1alpha1Volume,
    }
  | { error: any, body: null },
> {
  const result = yield call(
    Metalk8sVolumesApi.getMetalk8sV1alpha1Volume,
    volumeName,
  );
  if (!result.error) {
    yield put(setCurrentVolumeObjectAction({ data: result.body }));
  } else {
    yield put(setCurrentVolumeObjectAction({ data: null }));
  }
}

export function* refreshPersistentVolumes(): Generator<
  Effect,
  void,
  | {
      body: V1PersistentVolumeList,
    }
  | { error: any, body: null }
  | boolean,
> {
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

export function* stopRefreshPersistentVolumes(): Generator<
  Effect,
  void,
  boolean,
> {
  yield put(updatePersistentVolumesRefreshingAction(false));
}

export function* deleteVolume({ payload }: { payload: string }): Generator<
  Effect,
  void,
  | {
      body: Metalk8sV1alpha1Volume,
    }
  | { error: any, body: null }
  | boolean,
> {
  const result = yield call(
    Metalk8sVolumesApi.deleteMetalk8sV1alpha1Volume,
    payload,
  );
  const intl = yield select(intlSelector);
  if (!result.error) {
    yield put(
      addNotificationSuccessAction({
        title: intl.formatMessage({ id: 'volume_deletion' }),
        message: intl.formatMessage(
          { id: 'volume_delete_success' },
          {
            name: payload,
          },
        ),
      }),
    );
  } else {
    yield put(
      addNotificationErrorAction({
        title: intl.formatMessage({ id: 'volume_deletion' }),
        message: intl.formatMessage(
          { id: 'volume_delete_failed' },
          {
            name: payload,
          },
        ),
      }),
    );
  }
  yield call(fetchVolumes);
}

export function* volumesSaga(): Generator<Effect, void, void> {
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
  yield takeLatest(FETCH_CURRENT_VOLUME_OBJECT, fetchCurrentVolumeObject);
}
