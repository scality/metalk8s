import type { RootState } from '../reducer';
import { Effect, put, takeEvery, select } from 'redux-saga/effects';
// Actions
const TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR';
const INIT_TOGGLE_SIDEBAR = 'INIT_TOGGLE_SIDEBAR';
export const SET_TOGGLE_SIDEBAR = 'SET_TOGGLE_SIDEBAR';
export const SIDEBAR_EXPANDED = 'sidebar_expanded';
// Reducer
const defaultState = {
  sidebar: {
    expanded: true,
  },
};
export type LayoutState = {
  sidebar: {
    expanded: boolean;
  };
};
export default function reducer(
  state: LayoutState = defaultState,
  action: any = {},
) {
  switch (action.type) {
    case SET_TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebar: { ...state.sidebar, expanded: !state.sidebar.expanded },
      };

    default:
      return state;
  }
} // Action Creators

export const setToggleSidebarAction = () => {
  return {
    type: SET_TOGGLE_SIDEBAR,
  };
};
export const toggleSideBarAction = () => {
  return {
    type: TOGGLE_SIDEBAR,
  };
};
export const initToggleSideBarAction = () => {
  return {
    type: INIT_TOGGLE_SIDEBAR,
  };
};
// Selectors
export const isSidebarExpandedSelector = (state: RootState) =>
  state.app.layout.sidebar.expanded;
// Sagas
export function* toggleSideBar(): Generator<Effect, void, boolean> {
  yield put(setToggleSidebarAction());
  const expanded = yield select(isSidebarExpandedSelector);
  localStorage.setItem(SIDEBAR_EXPANDED, JSON.stringify(expanded));
}
export function* initToggleSideBar(): Generator<Effect, void, void> {
  const storedSidebarState = localStorage.getItem(SIDEBAR_EXPANDED);

  if (storedSidebarState) {
    const expanded = yield select(isSidebarExpandedSelector);

    if (expanded !== JSON.parse(storedSidebarState)) {
      yield put(setToggleSidebarAction());
    }
  }
}
export function* layoutSaga(): Generator<Effect, void, void> {
  yield takeEvery(TOGGLE_SIDEBAR, toggleSideBar);
  yield takeEvery(INIT_TOGGLE_SIDEBAR, initToggleSideBar);
}