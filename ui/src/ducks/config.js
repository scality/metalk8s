import { call, put, takeEvery, select } from 'redux-saga/effects';
import { mergeTheme } from '@scality/core-ui/dist/utils';
import * as defaultTheme from '@scality/core-ui/dist/style/theme';
import { loadUser, createUserManager } from 'redux-oidc';

import { store } from '../index';
import * as Api from '../services/api';
import * as ApiK8s from '../services/k8s/api';
import * as ApiSalt from '../services/salt/api';
import * as ApiPrometheus from '../services/prometheus/api';
import { fetchClusterVersion } from './app/nodes';
import { EN_LANG, FR_LANG, LANGUAGE } from '../constants';

// Actions
export const SET_LANG = 'SET_LANG';
export const SET_THEME = 'SET_THEME';
const FETCH_THEME = 'FETCH_THEME';
const FETCH_CONFIG = 'FETCH_CONFIG';
export const SET_API_CONFIG = 'SET_API_CONFIG';
const SET_INITIAL_LANGUAGE = 'SET_INITIAL_LANGUAGE';
const UPDATE_LANGUAGE = 'UPDATE_LANGUAGE';
const SET_USER_MANAGER_CONFIG = 'SET_USER_MANAGER_CONFIG';
const SET_USER_MANAGER = 'SET_USER_MANAGER';
export const UPDATE_API_CONFIG = 'UPDATE_API_CONFIG';

// Reducer
const defaultState = {
  language: EN_LANG,
  theme: {},
  api: null,
  userManagerConfig: {
    client_id: 'kubernetes',
    redirect_uri: 'http://localhost:8000/callback',
    response_type: 'id_token',
    scope: 'openid profile email offline_access',
    authority: '',
    loadUserInfo: false,
    post_logout_redirect_uri: '/'
  },
  userManager: null
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_LANG:
      return { ...state, language: action.payload };
    case SET_THEME:
      return { ...state, theme: action.payload };
    case SET_API_CONFIG:
      return { ...state, api: action.payload };
    case SET_USER_MANAGER_CONFIG:
      return {
        ...state,
        userManagerConfig: {
          ...state.userManagerConfig,
          authority: action.payload
        }
      };
    case SET_USER_MANAGER:
      return { ...state, userManager: action.payload };
    default:
      return state;
  }
}

// Action Creators
export function setLanguageAction(newLang) {
  return { type: SET_LANG, payload: newLang };
}

export function setThemeAction(theme) {
  return { type: SET_THEME, payload: theme };
}

export function fetchThemeAction() {
  return { type: FETCH_THEME };
}

export function fetchConfigAction() {
  return { type: FETCH_CONFIG };
}

export function setApiConfigAction(conf) {
  return { type: SET_API_CONFIG, payload: conf };
}

export function setInitialLanguageAction() {
  return { type: SET_INITIAL_LANGUAGE };
}

export function updateLanguageAction(language) {
  return { type: UPDATE_LANGUAGE, payload: language };
}

export function setUserManagerConfigAction(conf) {
  return { type: SET_USER_MANAGER_CONFIG, payload: conf };
}

export function setUserManagerAction(conf) {
  return { type: SET_USER_MANAGER, payload: conf };
}

export function updateAPIConfigAction(payload) {
  return { type: UPDATE_API_CONFIG, payload };
}

// Sagas
export function* fetchTheme() {
  const result = yield call(Api.fetchTheme);
  if (!result.error) {
    result.brand = mergeTheme(result, defaultTheme);
    yield put(setThemeAction(result));
  }
}

export function* fetchConfig() {
  yield call(Api.initialize, process.env.PUBLIC_URL);
  const result = yield call(Api.fetchConfig);
  if (!result.error && result.oidc_provider_url) {
    yield put(setUserManagerConfigAction(result.oidc_provider_url));
    const userManagerConfig = yield select(
      state => state.config.userManagerConfig
    );
    yield put(setUserManagerAction(createUserManager(userManagerConfig)));
    const userManager = yield select(state => state.config.userManager);
    yield call(loadUser, store, userManager);
    yield call(fetchTheme);
    yield put(setApiConfigAction(result));
    yield call(ApiSalt.initialize, result.url_salt);
    yield call(ApiPrometheus.initialize, result.url_prometheus);
    yield call(fetchClusterVersion);
  }
}

export function* setInitialLanguage() {
  const languageLocalStorage = localStorage.getItem(LANGUAGE);
  if (languageLocalStorage) {
    languageLocalStorage === FR_LANG
      ? yield put(setLanguageAction(FR_LANG))
      : yield put(setLanguageAction(EN_LANG));
  } else {
    yield put(
      setLanguageAction(navigator.language.startsWith('fr') ? FR_LANG : EN_LANG)
    );
  }
}

export function* updateLanguage(action) {
  yield put(setLanguageAction(action.payload));
  const language = yield select(state => state.config.language);
  localStorage.setItem(LANGUAGE, language);
}

export function* updateApiServerConfig({ payload }) {
  const api = yield select(state => state.config.api);
  yield call(
    ApiK8s.updateApiServerConfig,
    api.url,
    payload.id_token,
    payload.token_type
  );
}

export function* configSaga() {
  yield takeEvery(FETCH_THEME, fetchTheme);
  yield takeEvery(FETCH_CONFIG, fetchConfig);
  yield takeEvery(SET_INITIAL_LANGUAGE, setInitialLanguage);
  yield takeEvery(UPDATE_LANGUAGE, updateLanguage);
  yield takeEvery(UPDATE_API_CONFIG, updateApiServerConfig);
}
