import { call, takeEvery, put, select } from 'redux-saga/effects';
import * as ApiSalt from '../services/salt/api';

import { logoutAction } from './config'; /// this one is break!!!

import { connectSaltApiAction } from './app/salt';
import { appNamespaceSelector } from './namespaceHelper';

// // Actions
const AUTHENTICATE_SALT_API = 'AUTHENTICATE_SALT_API';
export const SALT_AUTHENTICATION_SUCCESS = 'SALT_AUTHENTICATION_SUCCESS';
export const SALT_AUTHENTICATION_FAILED = 'SALT_AUTHENTICATION_FAILED';

// Reducer
const defaultState = {
  salt: null,
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SALT_AUTHENTICATION_SUCCESS:
      return {
        ...state,
        salt: action.payload,
      };

    default:
      return state;
  }
}

// Action Creators
export const authenticateSaltApiAction = payload => {
  // didn't dispatch this action!!!
  return { type: AUTHENTICATE_SALT_API, payload };
};

export const setSaltAuthenticationSuccessAction = payload => {
  return {
    type: SALT_AUTHENTICATION_SUCCESS,
    payload,
  };
};

// Sagas
export function* authenticateSaltApi() {
  // const api = yield select(state => apiConfigSelector);
  const api = {};
  const user = yield select(state => appNamespaceSelector(state).oidc.user);
  const result = yield call(ApiSalt.authenticate, user);
  if (!result.error) {
    yield call(ApiSalt.getClient().setHeaders, {
      'X-Auth-Token': result.return[0].token,
    });
    yield put(setSaltAuthenticationSuccessAction(result));
    yield put(
      connectSaltApiAction({
        url: api.url_salt,
        token: result.return[0].token,
      }),
    );
  } else {
    yield put(logoutAction());
  }
}

export function* authenticateSaga() {
  yield takeEvery(AUTHENTICATE_SALT_API, authenticateSaltApi);
}
