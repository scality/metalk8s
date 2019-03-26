import { call, put, takeEvery } from 'redux-saga/effects';
import * as Api from '../services/api';

// Actions
const SET_LANG = 'SET_LANG';
export const SET_THEME = 'SET_THEME';
const FETCH_THEME = 'FETCH_THEME';
const FETCH_API_CONFIG = 'FETCH_API_CONFIG';
const SET_API_CONFIG = 'SET_API_CONFIG';

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

export function fetchApiConfigAction() {
  return { type: FETCH_API_CONFIG };
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

export function* fetchApiConfig() {
  const result = yield call(Api.fetchConfig);
  if (!result.error) {
    yield put(setApiConfigAction(result.data));
  }
}

export function* configSaga() {
  yield takeEvery(FETCH_THEME, fetchTheme);
  yield takeEvery(FETCH_API_CONFIG, fetchApiConfig);
}
