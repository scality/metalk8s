import { call, put, takeEvery } from 'redux-saga/effects';
import * as Api from '../services/api';
import { fetchUserInfoAction } from './login';

// Actions
const SET_LANG = 'SET_LANG';
export const SET_THEME = 'SET_THEME';
const FETCH_THEME = 'FETCH_THEME';
const FETCH_CONFIG = 'FETCH_CONFIG';
export const SET_API_CONFIG = 'SET_API_CONFIG';

// Reducer
const defaultState = {
  language: 'en',
  theme: {},
  api: null
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_LANG:
      return { ...state, language: action.payload };
    case SET_THEME:
      return { ...state, theme: action.payload };
    case SET_API_CONFIG:
      return { ...state, api: action.payload };
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

// Sagas
export function* fetchTheme() {
  const result = yield call(Api.fetchTheme);
  if (!result.error) {
    yield put(setThemeAction(result.data));
  }
}

export function* fetchConfig() {
  const result = yield call(Api.fetchConfig);
  if (!result.error) {
    yield call(fetchTheme);
    yield put(setApiConfigAction(result.data));
    yield put(fetchUserInfoAction());
  }
}

export function* configSaga() {
  yield takeEvery(FETCH_THEME, fetchTheme);
  yield takeEvery(FETCH_CONFIG, fetchConfig);
}
