import { takeLatest, call, put } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
// Actions
const FETCH_VOLUMES = 'FETCH_VOLUMES';
const SET_VOLUMES = 'SET_VOLUMES';

// Reducer
const defaultState = { volumes: [] };

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_VOLUMES:
      return { ...state, volumes: action.payload };
    default:
      return state;
  }
}
// Action Creators
export const fetchVolumesAction = () => {
  return { type: FETCH_VOLUMES };
};

export const setVolumesAction = payload => {
  return { type: SET_VOLUMES, payload };
};

// Sagas
export function* fetchVolumes() {
  // Call the API
  const result = yield call(ApiK8s.getVolumes);
  yield put(setVolumesAction(result.body.items));
}

export function* volumesSaga() {
  yield takeLatest(FETCH_VOLUMES, fetchVolumes);
}
