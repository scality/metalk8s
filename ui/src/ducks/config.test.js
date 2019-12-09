// TO BE FIXED: Mock import { store } from '../index' in 'config.js'
// Otherwise we have some issues to initialize reducers for testing
jest.mock('../index.js', () => {
  return {
    store: 'store',
  };
});

import { loadUser } from 'redux-oidc';

import { call, put, select } from 'redux-saga/effects';
import {
  fetchTheme,
  SET_THEME,
  fetchConfig,
  SET_API_CONFIG,
  updateLanguage,
  SET_LANG,
  setInitialLanguage,
  SET_USER_MANAGER_CONFIG,
  setUserManagerAction,
  SET_USER_MANAGER,
  SET_USER_LOADED,
} from './config.js';

import { LANGUAGE, FR_LANG, EN_LANG } from '../constants';
import * as Api from '../services/api';
import * as ApiK8s from '../services/k8s/api';
import * as ApiSalt from '../services/salt/api';
import * as ApiPrometheus from '../services/prometheus/api';

it('update the theme state when fetchTheme', () => {
  const gen = fetchTheme();

  expect(gen.next().value).toEqual(call(Api.fetchTheme));

  const result = {
    data: {
      brand: {
        primary: '#283593',
      },
    },
  };

  expect(gen.next(result).value).toEqual(
    put({ type: SET_THEME, payload: result }),
  );
});

it('update the config state when fetchConfig', () => {
  const gen = fetchConfig();

  expect(gen.next().value).toEqual(call(Api.initialize, ''));
  expect(gen.next().value).toEqual(call(Api.fetchConfig));

  const result = {
    url: 'https://172.21.254.14:6443',
    url_salt: 'http://172.21.254.13:4507',
    url_prometheus: 'http://172.21.254.46:30222',
    url_oidc_provider: 'http://172.21.254.46:32000',
    url_redirect: 'http://172.21.254.46:3000',
  };

  expect(gen.next(result).value).toEqual(call(fetchTheme));

  expect(gen.next(result).value).toEqual(
    put({ type: SET_API_CONFIG, payload: result }),
  );

  expect(gen.next(result).value).toEqual(
    call(ApiSalt.initialize, 'http://172.21.254.13:4507'),
  );
  expect(gen.next(result).value).toEqual(
    call(ApiPrometheus.initialize, 'http://172.21.254.46:30222'),
  );

  expect(gen.next().value).toEqual(
    put({
      type: SET_USER_MANAGER_CONFIG,
      payload: {
        authority: result.url_oidc_provider,
        redirect_uri: result.url_redirect,
      },
    }),
  );
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next().value.payload.action.type).toEqual(SET_USER_MANAGER);
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next().value).toEqual(call(loadUser, 'store', undefined));
  expect(gen.next().value).toEqual(
    put({
      type: SET_USER_LOADED,
      payload: true,
    }),
  );
  expect(gen.next().done).toEqual(true);
});

it('update the language when updateLanguage', () => {
  const gen = updateLanguage({ payload: 'Chinese' });
  expect(gen.next().value).toEqual(put({ type: SET_LANG, payload: 'Chinese' }));

  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next('Chinese').done).toEqual(true);

  expect(localStorage.getItem(LANGUAGE)).toEqual('Chinese');
  expect(localStorage.removeItem(LANGUAGE));
});

it('set initial language from localstorage', () => {
  const gen = setInitialLanguage();
  localStorage.setItem(LANGUAGE, FR_LANG);
  expect(gen.next().value).toEqual(put({ type: SET_LANG, payload: FR_LANG }));
  expect(gen.next().done).toEqual(true);
});

it('set initial language from browser', () => {
  expect(localStorage.removeItem(LANGUAGE));
  const gen = setInitialLanguage();

  const language = navigator.language.startsWith('fr') ? FR_LANG : EN_LANG;
  expect(gen.next().value).toEqual(put({ type: SET_LANG, payload: language }));
  expect(gen.next().done).toEqual(true);
});
