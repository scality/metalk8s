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
        errors: { authentication: action.payload.message }
      };
    default:
      return state;
  }
}

// Action Creators
export const authenticateAction = payload => {
  return { type: AUTHENTICATE, payload };
};

export const logoutAction = () => {
  return { type: LOGOUT };
};

// Sagas
function* authenticate({ payload }) {
  const { username, password } = payload;
  const token = btoa(username + ':' + password); //base64Encode

  const result = yield call(Api.authenticate, token);
  if (result.error) {
    yield put({
      type: AUTHENTICATION_FAILED,
      payload: result.error.response.data
    });
  } else {
    localStorage.setItem('token', token);
    yield put({
      type: AUTHENTICATION_SUCCESS,
      payload: {
        username,
        password,
        token
      }
    });
    yield call(history.push, '/');
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
