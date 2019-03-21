import { call, put } from 'redux-saga/effects';
import { fetchTheme, SET_THEME } from './config';
import * as Api from '../services/api';

it('update the theme state when fetchTheme', () => {
  const gen = fetchTheme();

  expect(gen.next().value).toEqual(call(Api.fetchTheme));

  const result = {
    data: {
      brand: {
        primary: '#283593'
      }
    }
  };

  expect(gen.next(result).value).toEqual(
    put({ type: SET_THEME, payload: result.data })
  );
});
