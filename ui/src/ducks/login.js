//@flow
import type { RootState } from './reducer';
import { Effect, call, takeEvery, put, select } from 'redux-saga/effects';
import * as ApiSalt from '../services/salt/api';

import type { Config } from '../services/api';
import { apiConfigSelector, logoutAction } from './config';
import { connectSaltApiAction } from './app/salt';
import { User } from 'oidc-client';

// Actions
const AUTHENTICATE_SALT_API = 'AUTHENTICATE_SALT_API';
export const SALT_AUTHENTICATION_SUCCESS = 'SALT_AUTHENTICATION_SUCCESS';
export const SALT_IS_UNAVAILABLE = 'SALT_IS_UNAVAILABLE';

// Reducer
const defaultState = {
  salt: null,
  isSaltUnavailable: false,
};

export type LoginState = {
  salt: ?ApiSalt.SaltToken,
  isSaltUnavailable: boolean,
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
    case SALT_IS_UNAVAILABLE:
      return {
        ...state,
        isSaltUnavailable: true,
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

export const setSaltIsUnavailableAction = () => {
  return {
    type: SALT_IS_UNAVAILABLE,
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
  } else if (
    result &&
    result.error &&
    (!result.error.response ||
      result.error.response.status === 401)
  ) {
    yield put(setSaltIsUnavailableAction());
  } else {
    yield put(logoutAction());
  }
}

export function* authenticateSaga(): Generator<Effect, void, void> {
  yield takeEvery(AUTHENTICATE_SALT_API, authenticateSaltApi);
}
