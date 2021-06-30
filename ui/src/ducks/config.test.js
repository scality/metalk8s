// TO BE FIXED: Mock import { store } from '../index' in 'config.js'
// Otherwise we have some issues to initialize reducers for testing
jest.mock('../index.js', () => {
  return {
    store: 'store',
  };
});

import { call, put, select } from 'redux-saga/effects';
import {
  fetchConfig,
  SET_API_CONFIG,
  setUserManagerAction,
  SET_USER_LOADED,
  setConfigStatusAction,
} from './config.js';
import { fetchUserInfo } from './login';
import { LANGUAGE, FR_LANG, EN_LANG } from '../constants';
import * as Api from '../services/api';
import * as ApiK8s from '../services/k8s/api';
import * as ApiSalt from '../services/salt/api';
import * as ApiPrometheus from '../services/prometheus/api';
import * as ApiAlertmanager from '../services/alertmanager/api';
import * as ApiLoki from '../services/loki/api';

it('update the config state when fetchConfig', () => {
  const gen = fetchConfig();

  expect(gen.next().value).toEqual(put(setConfigStatusAction('loading')));
  expect(gen.next().value).toEqual(call(Api.initialize, undefined));
  expect(gen.next().value).toEqual(call(Api.fetchConfig));

  const result = {
    url: 'https://172.21.254.14:6443',
    url_salt: 'http://172.21.254.13:4507',
    url_prometheus: 'http://172.21.254.46:30222',
    url_alertmanager: 'http://172.21.254.46:8443',
    url_loki: 'http://172.21.254.46:8080',
  };

  expect(gen.next(result).value).toEqual(
    put({ type: SET_API_CONFIG, payload: result }),
  );

  expect(gen.next().done).toEqual(true);
});
