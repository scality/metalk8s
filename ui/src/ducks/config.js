import { call, put, takeEvery, select } from 'redux-saga/effects';
import { mergeTheme } from '@scality/core-ui/dist/utils';
import * as defaultTheme from '@scality/core-ui/dist/style/theme';
import { loadUser, createUserManager } from 'redux-oidc';
import { USER_FOUND } from 'redux-oidc';
import { WebStorageStateStore } from 'oidc-client';
import { store } from '../index';
import * as Api from '../services/api';
import * as ApiK8s from '../services/k8s/api';
import * as ApiSalt from '../services/salt/api';
import * as ApiPrometheus from '../services/prometheus/api';
import { EN_LANG, FR_LANG, LANGUAGE } from '../constants';

import { authenticateSaltApi } from './login';
// Actions
export const SET_LANG = 'SET_LANG';
export const SET_THEME = 'SET_THEME';

const FETCH_THEME = 'FETCH_THEME';
const FETCH_CONFIG = 'FETCH_CONFIG';
export const SET_API_CONFIG = 'SET_API_CONFIG';
const SET_INITIAL_LANGUAGE = 'SET_INITIAL_LANGUAGE';
const UPDATE_LANGUAGE = 'UPDATE_LANGUAGE';
export const SET_USER_MANAGER_CONFIG = 'SET_USER_MANAGER_CONFIG';
export const SET_USER_MANAGER = 'SET_USER_MANAGER';
export const UPDATE_API_CONFIG = 'UPDATE_API_CONFIG';
export const LOGOUT = 'LOGOUT';
export const SET_USER_LOADED = 'SET_USER_LOADED';
export const SET_THEMES = 'SET_THEMES';

// Reducer
const defaultState = {
  language: EN_LANG,
  theme: {}, // current theme
  api: null,
  userManagerConfig: {
    client_id: 'metalk8s-ui',
    redirect_uri: 'http://localhost:3000/callback',
    response_type: 'id_token',
    scope:
      'openid profile email offline_access audience:server:client_id:oidc-auth-client',
    authority: '',
    loadUserInfo: false,
    post_logout_redirect_uri: '/',
    userStore: new WebStorageStateStore({ store: localStorage }),
  },
  userManager: null,
  isUserLoaded: false,
  themes: {}, // include light, dark and custom
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
          ...action.payload,
        },
      };
    case SET_USER_MANAGER:
      return { ...state, userManager: action.payload };
    case SET_USER_LOADED:
      return { ...state, isUserLoaded: action.payload };
    case SET_THEMES:
      return { ...state, themes: action.payload };
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

export function setUserManagerConfigAction(payload) {
  return { type: SET_USER_MANAGER_CONFIG, payload };
}

export function setUserManagerAction(conf) {
  return { type: SET_USER_MANAGER, payload: conf };
}

export function setUserLoadedAction(isLoaded) {
  return { type: SET_USER_LOADED, payload: isLoaded };
}

export function updateAPIConfigAction(payload) {
  return { type: UPDATE_API_CONFIG, payload };
}

export function logoutAction() {
  return { type: LOGOUT };
}

export function setThemesAction(themes) {
  return { type: SET_THEMES, payload: themes };
}

// Selectors
export const languageSelector = state => state.config.language;
export const apiConfigSelector = state => state.config.api;

// Sagas
export function* fetchTheme() {
  const result = yield call(Api.fetchTheme);
  if (!result.error) {
    // get the default theme from configMap
    const defaultThemeMode = result.default;
    result.theme[defaultThemeMode].brand = mergeTheme(
      result.theme[defaultThemeMode],
      defaultTheme,
    );
    yield put(setThemesAction(result.theme));
    yield put(setThemeAction(result.theme[defaultThemeMode]));
  }
}

export function* fetchConfig() {
  yield call(Api.initialize, process.env.PUBLIC_URL);
  const result = yield call(Api.fetchConfig);
  if (!result.error && result.url_oidc_provider && result.url_redirect) {
    yield call(fetchTheme);
    yield put(setApiConfigAction(result));
    yield call(ApiSalt.initialize, result.url_salt);
    yield call(ApiPrometheus.initialize, result.url_prometheus);
    yield put(
      setUserManagerConfigAction({
        authority: result.url_oidc_provider,
        redirect_uri: result.url_redirect,
      }),
    );
    const userManagerConfig = yield select(
      state => state.config.userManagerConfig,
    );
    yield put(setUserManagerAction(createUserManager(userManagerConfig)));
    const userManager = yield select(state => state.config.userManager);
    yield call(loadUser, store, userManager);
    yield put(setUserLoadedAction(true));
  }
}

export function* updateApiServerConfig({ payload }) {
  const api = yield select(state => state.config.api);
  if (api) {
    yield call(
      ApiK8s.updateApiServerConfig,
      api.url,
      payload.id_token,
      payload.token_type,
    );
    yield call(authenticateSaltApi);
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
      setLanguageAction(
        navigator.language.startsWith('fr') ? FR_LANG : EN_LANG,
      ),
    );
  }
}

export function* updateLanguage(action) {
  yield put(setLanguageAction(action.payload));
  const language = yield select(languageSelector);
  localStorage.setItem(LANGUAGE, language);
}

export function* logout() {
  const userManager = yield select(state => state.config.userManager);
  if (userManager) {
    userManager.removeUser(); // removes the user data from sessionStorage
  }
}

export function* userFoundHandle(payload) {
  yield call(updateApiServerConfig, payload);
}

export function* configSaga() {
  yield takeEvery(FETCH_THEME, fetchTheme);
  yield takeEvery(FETCH_CONFIG, fetchConfig);
  yield takeEvery(SET_INITIAL_LANGUAGE, setInitialLanguage);
  yield takeEvery(UPDATE_LANGUAGE, updateLanguage);
  yield takeEvery(UPDATE_API_CONFIG, updateApiServerConfig);
  yield takeEvery(USER_FOUND, userFoundHandle);
  yield takeEvery(LOGOUT, logout);
}
