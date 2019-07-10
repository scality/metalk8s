import { put, takeEvery, select } from 'redux-saga/effects';

// Actions
const TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR';
const INIT_TOGGLE_SIDEBAR = 'INIT_TOGGLE_SIDEBAR';
export const SET_TOGGLE_SIDEBAR = 'SET_TOGGLE_SIDEBAR';
export const SIDEBAR_EXPENDED = 'sidebar_expended';

// Reducer
const defaultState = {
  sidebar: {
    expanded: true
  }
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          expanded: !state.sidebar.expanded
        }
      };
    default:
      return state;
  }
}

// Action Creators
export const setToggleSidebarAction = () => {
  return { type: SET_TOGGLE_SIDEBAR };
};

export const toggleSideBarAction = () => {
  return { type: TOGGLE_SIDEBAR };
};

export const initToggleSideBarAction = () => {
  return { type: INIT_TOGGLE_SIDEBAR };
};

export function* toggleSideBar() {
  yield put(setToggleSidebarAction());
  const expanded = yield select(state => state.app.layout.sidebar.expanded);
  localStorage.setItem(SIDEBAR_EXPENDED, expanded);
}

export function* initToggleSideBar() {
  if (localStorage.getItem(SIDEBAR_EXPENDED)) {
    const expanded = yield select(state => state.app.layout.sidebar.expanded);
    if (expanded !== JSON.parse(localStorage.getItem(SIDEBAR_EXPENDED))) {
      yield put(setToggleSidebarAction());
    }
  }
}

export function* layoutSaga() {
  yield takeEvery(TOGGLE_SIDEBAR, toggleSideBar);
  yield takeEvery(INIT_TOGGLE_SIDEBAR, initToggleSideBar);
}
