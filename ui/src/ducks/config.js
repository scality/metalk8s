import { call, put, takeEvery } from 'redux-saga/effects';
import * as Api from '../services/api';

// Actions
const SET_LANG = 'SET_LANG';
const SET_THEME = 'SET_THEME';
const FETCH_THEME = 'FETCH_THEME';

// Reducer
const defaultState = {
  language: 'en',
  theme: {}
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_LANG:
      return { ...state, language: action.payload };
    case SET_THEME:
      return { ...state, theme: action.payload };
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

// Sagas
function* fetchTheme() {
  const result = yield call(Api.fetchTheme);
  if (!result.error) {
    yield put(setThemeAction(result.data));
  }
}

export function* configSaga() {
  yield takeEvery(FETCH_THEME, fetchTheme);
}
