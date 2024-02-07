// TO BE FIXED: Mock import { store } from '../index' in 'config.js'
// Otherwise we have some issues to initialize reducers for testing
import * as Api from '../services/api';
import { SET_API_CONFIG, fetchConfig, setConfigStatusAction } from './config';
import { call, put } from 'redux-saga/effects';
jest.mock('../index.ts', () => {
  return {
    store: 'store',
  };
});
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
  // @ts-expect-error - FIXME when you are working on it
  expect(gen.next(result).value).toEqual(
    put({
      type: SET_API_CONFIG,
      payload: result,
    }),
  );
  expect(gen.next().done).toEqual(true);
});
