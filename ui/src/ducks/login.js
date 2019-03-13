import { call, takeEvery, put } from 'redux-saga/effects';
import * as Api from '../services/api';
import history from '../history';

// Actions
const AUTHENTICATE = 'AUTHENTICATE';
const AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS';
const AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED';
const LOGOUT = 'LOGOUT';

// Reducer
const defaultState = {
  user: null,
  error: null
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case AUTHENTICATION_SUCCESS:
      return {
        ...state,
        user: action.payload
      };
    case AUTHENTICATION_FAILED:
      return {
        ...state,
        error: action.payload
      };
    default:
      return state;
  }
}

// Action Creators
export const autheticateAction = payload => {
  return { type: AUTHENTICATE, payload };
};

export const logoutAction = () => {
  return { type: LOGOUT };
};

// Sagas
function* authenticate({ payload }) {
  try {
    const response = yield call(Api.authenticate, payload);
    yield put({
      type: AUTHENTICATION_SUCCESS,
      payload: response.data
    });
    yield call(history.push, '/');
  } catch (err) {
    yield put({
      type: AUTHENTICATION_FAILED,
      payload: err
    });
  }
}

function* logout() {
  yield call(Api.logout);
  yield call(history.push, '/login');
}

export function* authenticateSaga() {
  yield takeEvery(AUTHENTICATE, authenticate);
  yield takeEvery(LOGOUT, logout);
}
