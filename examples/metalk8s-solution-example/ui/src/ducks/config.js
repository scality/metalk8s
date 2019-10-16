import { call, put, takeEvery } from 'redux-saga/effects';
import { mergeTheme } from '@scality/core-ui/dist/utils';
import * as defaultTheme from '@scality/core-ui/dist/style/theme';
import * as Api from '../services/api';
import * as ApiK8s from '../services/k8s/api';
import { fetchUserInfo } from './login';
import { SOLUTION_NAME } from '../constants';
// Actions
const SET_LANG = 'SET_LANG';
export const SET_THEME = 'SET_THEME';
const FETCH_THEME = 'FETCH_THEME';
const FETCH_CONFIG = 'FETCH_CONFIG';
export const SET_API_CONFIG = 'SET_API_CONFIG';
const SET_VERSIONS = 'SET_VERSIONS';
const FETCH_VERSIONS = 'FETCH_VERSIONS';

// Reducer
const defaultState = {
  language: 'en',
  theme: {},
  api: null,
  versions: []
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_LANG:
      return { ...state, language: action.payload };
    case SET_THEME:
      return { ...state, theme: action.payload };
    case SET_API_CONFIG:
      return { ...state, api: action.payload };
    case SET_VERSIONS:
      return { ...state, versions: action.payload };
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

export function setVersionsAction(payload) {
  return { type: SET_VERSIONS, payload };
}

export function fetchVersionsAction() {
  return { type: FETCH_VERSIONS };
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
  if (!result.error) {
    yield call(fetchTheme);
    yield put(setApiConfigAction(result));
    yield call(ApiK8s.initialize, result.url);
    yield call(fetchUserInfo);
  }
}

export function* fetchVersions() {
  const result = yield call(ApiK8s.getSolutionsConfigMap);
  if (!result.error) {
    const solutionsConfigMap = result.body;
    if (solutionsConfigMap && solutionsConfigMap.data) {
      const solution = solutionsConfigMap.data[SOLUTION_NAME];
      if (solution) {
        yield put(setVersionsAction(JSON.parse(solution)));
      }
    }
  }
  return result;
}

export function* configSaga() {
  yield takeEvery(FETCH_THEME, fetchTheme);
  yield takeEvery(FETCH_CONFIG, fetchConfig);
  yield takeEvery(FETCH_VERSIONS, fetchVersions);
}
