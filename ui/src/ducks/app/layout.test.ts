import { put } from 'redux-saga/effects';
import {
  SET_TOGGLE_SIDEBAR,
  SIDEBAR_EXPANDED,
  toggleSideBar,
  initToggleSideBar,
} from './layout';
it('should toggleSideBar', () => {
  const gen = toggleSideBar();
  expect(gen.next().value).toEqual(
    put({
      type: SET_TOGGLE_SIDEBAR,
    }),
  );
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next().done).toEqual(true);
});
it('should initToggleSideBar', () => {
  localStorage.setItem(SIDEBAR_EXPANDED, 'true');
  const gen = initToggleSideBar();
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next().value).toEqual(
    put({
      type: SET_TOGGLE_SIDEBAR,
    }),
  );
  expect(gen.next().done).toEqual(true);
});