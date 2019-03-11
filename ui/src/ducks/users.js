import { call, takeEvery, put } from 'redux-saga/effects';
import * as Api from '../services/api';

// Actions
const FETCH_USERS = 'FETCH_USERS';
const SET_USERS = 'SET_USERS';

// Reducer
const defaultState = {
  users: []
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_USERS:
      return { ...state, users: action.payload };
    default:
      return state;
  }
}

// Action Creators
export const fetchUsersAction = () => {
  return { type: FETCH_USERS };
};

export const setUsersAction = payload => {
  return { type: SET_USERS, payload };
};

// Sagas
function* fetchUsers() {
  try {
    const result = yield call(Api.fetchUserList);
    yield put(setUsersAction(result.data.data));
  } catch (e) {}
}

export function* usersSaga() {
  yield takeEvery(FETCH_USERS, fetchUsers);
}
