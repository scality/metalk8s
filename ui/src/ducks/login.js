//@flow
import type { RootState } from './reducer';
import { Effect, call, takeEvery, put, select } from 'redux-saga/effects';
import * as ApiSalt from '../services/salt/api';

import type { Config } from '../services/api';
import { apiConfigSelector } from './config';
import { connectSaltApiAction } from './app/salt';
import { User } from 'oidc-client';
import { addNotificationErrorAction } from './app/notifications';

// Actions
const AUTHENTICATE_SALT_API = 'AUTHENTICATE_SALT_API';
export const SALT_AUTHENTICATION_SUCCESS = 'SALT_AUTHENTICATION_SUCCESS';
export const SALT_AUTHENTICATION_FAILED = 'SALT_AUTHENTICATION_FAILED';
//Selecter
const intlSelector = (state: RootState) => state.config.intl;

// Reducer
const defaultState = {
  salt: null,
};

export type LoginState = {
  salt: ?ApiSalt.SaltToken,
};

export default function reducer(
  state: LoginState = defaultState,
  action: any = {},
) {
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
export const setSaltAuthenticationSuccessAction = (
  payload: ApiSalt.SaltToken,
) => {
  return {
    type: SALT_AUTHENTICATION_SUCCESS,
    payload,
  };
};

// Sagas
export function* authenticateSaltApi(): Generator<Effect, void, any> {
  const api: ?Config = yield select(apiConfigSelector);
  const user: User = yield select((state: RootState) => state.oidc?.user);
  const result: { error: any } | ApiSalt.SaltToken = yield call(
    ApiSalt.authenticate,
    user,
  );
  const intl = yield select(intlSelector);

  if (api && result && !result.error) {
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
    yield put(
      addNotificationErrorAction({
        title: intl.formatMessage({ id: 'salt_login_error_title' }),
        message: intl.formatMessage({ id: 'salt_login_error_message' }),
      }),
    );
  }
}

export function* authenticateSaga(): Generator<Effect, void, void> {
  yield takeEvery(AUTHENTICATE_SALT_API, authenticateSaltApi);
}
