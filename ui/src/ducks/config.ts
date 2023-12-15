import { IntlShape } from 'react-intl';
import type { RootState } from './reducer';
import type { Config } from '../services/api';
import { Effect, call, put, takeEvery, select } from 'redux-saga/effects';
import * as Api from '../services/api';
import * as ApiK8s from '../services/k8s/api';
import * as ApiSalt from '../services/salt/api';
import * as ApiPrometheus from '../services/prometheus/api';
import * as ApiAlertmanager from '../services/alertmanager/api';
import * as ApiLoki from '../services/loki/api';
import { EN_LANG } from '../constants';
import { authenticateSaltApi } from './login';
import type { Result } from '../types';
import { logOut, setUser } from './oidc';
import { CoreApi } from '../services/k8s/core';
import { Metalk8sV1alpha1VolumeClient } from '../services/k8s/Metalk8sVolumeClient.generated';
import { StorageApi } from '../services/k8s/volumes';

// Actions
export const SET_LANG = 'SET_LANG';
const FETCH_CONFIG = 'FETCH_CONFIG';
export const SET_API_CONFIG = 'SET_API_CONFIG';
export const SET_CONFIG_STATUS = 'SET_CONFIG_STATUS';
export const UPDATE_API_CONFIG = 'UPDATE_API_CONFIG';
export const LOGOUT = 'LOGOUT';
export const SET_USER_LOADED = 'SET_USER_LOADED';
export const SET_CORE_API_CLIENT = 'SET_CORE_API_CLIENT';
export const SET_CUSTOM_OBJECT_API_CLIENT = 'SET_CUSTOM_OBJECT_API_CLIENT';
export const SET_STORAGE_API_CLIENT = 'SET_STORAGE_API_CLIENT';
const SET_INTL = 'SET_INTL';
// Reducer
type Status = 'idle' | 'loading' | 'error' | 'success';
export type ConfigState = {
  language: string;
  api: Config | null | undefined;
  status: Status;
  intl: IntlShape;
  coreApi: CoreApi | null;
  customObjectsApi: Metalk8sV1alpha1VolumeClient | null;
  storageApi: StorageApi | null;
};
const defaultState: ConfigState = {
  language: EN_LANG,
  // current theme
  api: null,
  status: 'idle',
  intl: {},
  coreApi: null,
  customObjectsApi: null,
  storageApi: null,
};
export default function reducer(
  state: ConfigState = defaultState,
  action: any = {},
) {
  switch (action.type) {
    case SET_LANG:
      return { ...state, language: action.payload };

    case SET_THEME:
      return { ...state, theme: action.payload };

    case SET_API_CONFIG:
      return { ...state, api: action.payload };

    case SET_USER_LOADED:
      return { ...state, isUserLoaded: action.payload };

    case SET_CONFIG_STATUS:
      return { ...state, status: action.status };

    case SET_INTL:
      return { ...state, intl: action.payload };
    case SET_CORE_API_CLIENT:
      return { ...state, coreApi: action.payload };
    case SET_CUSTOM_OBJECT_API_CLIENT:
      return { ...state, customObjectsApi: action.payload };
    case SET_STORAGE_API_CLIENT:
      return { ...state, storageApi: action.payload };
    default:
      return state;
  }
} // Action Creators

export function setLanguageAction(newLang: string) {
  return {
    type: SET_LANG,
    payload: newLang,
  };
}

export function fetchConfigAction() {
  return {
    type: FETCH_CONFIG,
  };
}
export function setApiConfigAction(conf: Config) {
  return {
    type: SET_API_CONFIG,
    payload: conf,
  };
}
export function setConfigStatusAction(status: Status) {
  return {
    type: SET_CONFIG_STATUS,
    status,
  };
}
export function setCoreApiClient(client: CoreApi) {
  return {
    type: SET_CORE_API_CLIENT,
    payload: client,
  };
}
export function setCustomObjectApiClient(client: Metalk8sV1alpha1VolumeClient) {
  return {
    type: SET_CUSTOM_OBJECT_API_CLIENT,
    payload: client,
  };
}

export function setStoreApiClient(client: StorageApi) {
  return {
    type: SET_STORAGE_API_CLIENT,
    payload: client,
  };
}

export function updateAPIConfigAction(payload: { token: string }) {
  return {
    type: UPDATE_API_CONFIG,
    payload,
  };
}
export function logoutAction() {
  return {
    type: LOGOUT,
  };
}
export function setIntlAction(intl: IntlShape) {
  return {
    type: SET_INTL,
    payload: intl,
  };
}
// Selectors
export const languageSelector = (state: RootState) => state.config.language;
export const apiConfigSelector = (state: RootState) => state.config.api;
// Sagas
export function* fetchConfig(): Generator<Effect, void, Result<Config>> {
  yield put(setConfigStatusAction('loading'));
  yield call(Api.initialize, process.env.PUBLIC_URL);
  const result = yield call(Api.fetchConfig);

  if (!result.error) {
    yield put(setApiConfigAction(result));
  } else {
    yield put(setConfigStatusAction('error'));
  }
}

function* setApiConfig({
  payload: config,
}: {
  payload: Config;
}): Generator<Effect, void, Result<Config>> {
  yield call(ApiSalt.initialize, config.url_salt);
  yield call(ApiPrometheus.initialize, config.url_prometheus);
  yield call(ApiAlertmanager.initialize, config.url_alertmanager);
  yield call(ApiLoki.initialize, config.url_loki);
  yield put(setConfigStatusAction('success'));
}

export function* updateApiServerConfig({
  payload,
}: {
  payload: {
    token: string;
  };
}): Generator<Effect, void, Config> {
  const api = yield select((state: RootState) => state.config.api);

  if (api) {
    yield put(setUser(payload));

    const { appsV1, coreV1, customObjects, storage } =
      ApiK8s.updateApiServerConfig(api.url, payload.token);
    yield put(
      setCustomObjectApiClient(new Metalk8sV1alpha1VolumeClient(customObjects)),
    );
    yield put(setCoreApiClient(new CoreApi(coreV1, appsV1)));
    yield put(setStoreApiClient(new StorageApi(coreV1, storage)));

    yield call(authenticateSaltApi);
  }
}
export function* configSaga(): Generator<Effect, void, void> {
  yield takeEvery(FETCH_CONFIG, fetchConfig);
  yield takeEvery(SET_API_CONFIG, setApiConfig);
  yield takeEvery(UPDATE_API_CONFIG, updateApiServerConfig);
  yield takeEvery(LOGOUT, logOut);
}
