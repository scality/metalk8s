import { call, put } from 'redux-saga/effects';
import { fetchTheme, SET_THEME, fetchConfig, SET_API_CONFIG } from './config';
import { fetchUserInfo } from './login';
import * as ApiK8s from '../services/k8s/api';
import * as Api from '../services/api';

it('update the theme state when fetchTheme', () => {
  const gen = fetchTheme();
  expect(gen.next().value).toEqual(call(Api.fetchTheme));

  const result = {
    brand: {
      primary: '#283593'
    }
  };

  expect(gen.next(result).value).toEqual(
    put({ type: SET_THEME, payload: result })
  );
});

it('update the config state when fetchConfig', () => {
  const gen = fetchConfig();
  expect(gen.next().value).toEqual(call(Api.initialize, ''));
  expect(gen.next().value).toEqual(call(Api.fetchConfig));

  const result = {
    url: 'https://localhost:3333'
  };

  expect(gen.next(result).value).toEqual(call(fetchTheme));

  expect(gen.next(result).value).toEqual(
    put({ type: SET_API_CONFIG, payload: result })
  );

  expect(gen.next().value).toEqual(
    call(ApiK8s.initialize, 'https://localhost:3333')
  );

  expect(gen.next().value).toEqual(call(fetchUserInfo));
});
