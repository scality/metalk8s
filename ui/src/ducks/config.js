//@flow
import type { RootState } from './reducer';
import type { Config, Theme, Themes, WrappedThemes } from '../services/api';
import { call, put, takeEvery, select, Effect } from 'redux-saga/effects';
import { mergeTheme } from '@scality/core-ui/dist/utils';
import * as defaultTheme from '@scality/core-ui/dist/style/theme';
import { loadUser, createUserManager } from 'redux-oidc';
import { USER_FOUND } from 'redux-oidc';
import { UserManager, WebStorageStateStore } from 'oidc-client';
import { store } from '../index';
import * as Api from '../services/api';
import * as ApiK8s from '../services/k8s/api';
import * as ApiSalt from '../services/salt/api';
import * as ApiPrometheus from '../services/prometheus/api';
import * as ApiAlertmanager from '../services/alertmanager/api';
import { EN_LANG, FR_LANG, LANGUAGE } from '../constants';

import { authenticateSaltApi } from './login';
import type { Result } from '../types';
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
    scope: [
      'openid',
      'profile',
      'email',
      'groups',
      'offline_access', // For refresh tokens, not sure if that's useful
      'audience:server:client_id:oidc-auth-client', // A token for apiserver
    ].join(' '),
    authority: '',
    loadUserInfo: false,
    post_logout_redirect_uri: '/',
    userStore: new WebStorageStateStore({ store: localStorage }),
  },
  userManager: null,
  isUserLoaded: false,
  themes: {}, // include light, dark and custom
};

export type ConfigState = {
  language: string,
  theme: Theme,
  api: ?Config,
  userManagerConfig: {
    client_id: string,
    redirect_uri: string,
    response_type: string,
    scope: string,
    authority: string,
    loadUserInfo: boolean,
    post_logout_redirect_uri: string,
    userStore: WebStorageStateStore,
  },
  userManager: UserManager,
  isUserLoaded: boolean,
  themes: Themes,
}

export default function reducer(state: ConfigState = defaultState, action: any = {}) {
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
export function setLanguageAction(newLang: string) {
  return { type: SET_LANG, payload: newLang };
}

export function setThemeAction(theme: Theme) {
  return { type: SET_THEME, payload: theme };
}

export function fetchThemeAction() {
  return { type: FETCH_THEME };
}

export function fetchConfigAction() {
  return { type: FETCH_CONFIG };
}

export function setApiConfigAction(conf: Config) {
  return { type: SET_API_CONFIG, payload: conf };
}

export function setInitialLanguageAction() {
  return { type: SET_INITIAL_LANGUAGE };
}

// Todo : this actually seems to be never used and duplicate of setLanguageAction
export function updateLanguageAction(language: string) {
  return { type: UPDATE_LANGUAGE, payload: language };
}

export function setUserManagerConfigAction(payload: {authority: string,  redirect_uri: string}) {
  return { type: SET_USER_MANAGER_CONFIG, payload };
}

export function setUserManagerAction(conf: UserManager) {
  return { type: SET_USER_MANAGER, payload: conf };
}

export function setUserLoadedAction(isLoaded: boolean) {
  return { type: SET_USER_LOADED, payload: isLoaded };
}

// Todo : this actually seems to be never used and duplicate of setApiConfigAction
export function updateAPIConfigAction(payload: Config) {
  return { type: UPDATE_API_CONFIG, payload };
}

export function logoutAction() {
  return { type: LOGOUT };
}

export function setThemesAction(themes: Themes) {
  return { type: SET_THEMES, payload: themes };
}

// Selectors
export const languageSelector = (state: RootState) => state.config.language;
export const apiConfigSelector = (state: RootState) => state.config.api;

// Sagas
export function* fetchTheme(): Generator<Effect, void, Result<WrappedThemes>> {
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

export function* fetchConfig(): Generator<Effect, void, Result<Config>> {
  yield call(Api.initialize, process.env.PUBLIC_URL);
  const result = yield call(Api.fetchConfig);
  if (!result.error && result.url_oidc_provider && result.url_redirect) {
    yield call(fetchTheme);
    yield put(setApiConfigAction(result));
    yield call(ApiSalt.initialize, result.url_salt);
    yield call(ApiPrometheus.initialize, result.url_prometheus);
    yield call(ApiAlertmanager.initialize, result.url_alertmanager);

    yield put(
      setUserManagerConfigAction({
        authority: result.url_oidc_provider,
        redirect_uri: result.url_redirect,
      }),
    );
    const userManagerConfig = yield select(
      (state: RootState) => state.config.userManagerConfig,
    );
    yield put(setUserManagerAction(createUserManager(userManagerConfig)));
    const userManager = yield select((state) => state.config.userManager);
    yield call(loadUser, store, userManager);
    yield put(setUserLoadedAction(true));
  }
}

export function* updateApiServerConfig({ payload }: { payload: {id_token: string, token_type: string} }): Generator<any, void, Config> {
  const api = yield select((state: RootState) => state.config.api);
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

export function* setInitialLanguage(): Generator<any, void, string> {
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

export function* updateLanguage(action: {payload: string}): Generator<any, void, string> {
  yield put(setLanguageAction(action.payload));
  const language = yield select(languageSelector);
  localStorage.setItem(LANGUAGE, language);
}

export function* logout(): Generator<any, void, UserManager> {
  const userManager = yield select((state: RootState) => state.config.userManager);
  if (userManager) {
    userManager.removeUser(); // removes the user data from sessionStorage
  }
}

export function* userFoundHandle(payload: { payload: {id_token: string, token_type: string} }): Generator<void, void, void> {
  yield call(updateApiServerConfig, payload);
}

export function* configSaga(): Generator<void, void, void> {
  yield takeEvery(FETCH_THEME, fetchTheme);
  yield takeEvery(FETCH_CONFIG, fetchConfig);
  yield takeEvery(SET_INITIAL_LANGUAGE, setInitialLanguage);
  yield takeEvery(UPDATE_LANGUAGE, updateLanguage);
  yield takeEvery(UPDATE_API_CONFIG, updateApiServerConfig);
  yield takeEvery(USER_FOUND, userFoundHandle);
  yield takeEvery(LOGOUT, logout);
}
