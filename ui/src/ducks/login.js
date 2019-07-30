import { call, takeEvery, put, select } from 'redux-saga/effects';
import * as ApiSalt from '../services/salt/api';

import history from '../history';
import { connectSaltApiAction } from './app/nodes';

// Actions
const AUTHENTICATE_SALT_API = 'AUTHENTICATE_SALT_API';
export const SALT_AUTHENTICATION_SUCCESS = 'SALT_AUTHENTICATION_SUCCESS';
export const SALT_AUTHENTICATION_FAILED = 'SALT_AUTHENTICATION_FAILED';
const LOGOUT = 'LOGOUT';

// Reducer
const defaultState = {
  salt: null
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SALT_AUTHENTICATION_SUCCESS:
      return {
        ...state,
        salt: action.payload
      };
    default:
      return state;
  }
}

// Action Creators
export const authenticateSaltApiAction = payload => {
  return { type: AUTHENTICATE_SALT_API, payload };
};

export const logoutAction = () => {
  return { type: LOGOUT };
};

export const setSaltAuthenticationSuccessAction = payload => {
  return {
    type: SALT_AUTHENTICATION_SUCCESS,
    payload
  };
};

// Sagas
export function* authenticateSaltApi(redirect) {
  const api = yield select(state => state.config.api);
  const user = yield select(state => state.login.user);
  const result = yield call(ApiSalt.authenticate, user);
  if (!result.error) {
    yield call(ApiSalt.getClient().setHeaders, {
      'X-Auth-Token': result.return[0].token
    });
    yield put(setSaltAuthenticationSuccessAction(result));
    yield put(
      connectSaltApiAction({
        url: api.url_salt,
        token: result.return[0].token
      })
    );
    if (redirect) {
      yield call(history.push, '/');
    }
  } else {
    yield call(logout);
  }
}

export function* logout() {}

export function* authenticateSaga() {
  yield takeEvery(AUTHENTICATE_SALT_API, authenticateSaltApi);
  yield takeEvery(LOGOUT, logout);
}
