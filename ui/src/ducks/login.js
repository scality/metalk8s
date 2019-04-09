import { call, takeEvery, put, select } from 'redux-saga/effects';
import * as Api from '../services/api';
import history from '../history';

// Actions
const AUTHENTICATE = 'AUTHENTICATE';
const AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS';
const AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED';
const LOGOUT = 'LOGOUT';
const FETCH_USER_INFO = 'FETCH_USER_INFO';

// Reducer
const defaultState = {
  user: null,
  error: null,
  isUerInfoLoaded: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case AUTHENTICATION_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isUerInfoLoaded: true
      };
    case AUTHENTICATION_FAILED:
      return {
        ...state,
        errors: { authentication: action.payload.message },
        isUerInfoLoaded: true
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

export const fetchUserInfoAction = () => {
  return { type: FETCH_USER_INFO };
};

export const setAuthenticationSuccessAction = payload => {
  return {
    type: AUTHENTICATION_SUCCESS,
    payload
  };
};

// Sagas
function* authenticate({ payload }) {
  const { username, password } = payload;
  const token = btoa(username + ':' + password); //base64Encode
  const api_server = yield select(state => state.config.api);

  const result = yield call(Api.authenticate, token, api_server);
  if (result.error) {
    yield put({
      type: AUTHENTICATION_FAILED,
      payload: result.error.response.data
    });
  } else {
    localStorage.setItem('token', token);
    yield put(
      setAuthenticationSuccessAction({
        username,
        password,
        token
      })
    );
    yield call(history.push, '/');
  }
}

function* logout() {
  yield call(Api.logout);
  yield call(history.push, '/login');
}

function* fetchUserInfo() {
  const token = localStorage.getItem('token');
  const decryptedToken = atob(token);
  const splits = decryptedToken.split(':');

  const username = splits.length > 1 ? splits[0] : null;
  const password = splits.length > 1 ? splits[1] : null;

  yield put(
    setAuthenticationSuccessAction({
      username,
      password,
      token
    })
  );
  const api_server = yield select(state => state.config.api);
  yield call(Api.updateApiServerConfig, api_server.url, token);
}

export function* authenticateSaga() {
  yield takeEvery(AUTHENTICATE, authenticate);
  yield takeEvery(LOGOUT, logout);
  yield takeEvery(FETCH_USER_INFO, fetchUserInfo);
}
