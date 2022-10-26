import {
  V1ContainerStatus,
  V1Pod,
  V1PodList,
} from '@kubernetes/client-node/dist/gen/model/models';
import { Effect, call, put, takeLatest } from 'redux-saga/effects';
import * as CoreApi from '../../services/k8s/core';
import type { APIResult } from '../../types';
// Actions
const FETCH_PODS = 'FETCH_PODS';
export const SET_PODS = 'SET_PODS';
// Reducer
const defaultState = {
  list: [],
};
export type Pod = {
  name: string;
  namespace: string;
  nodeName: string;
  status: string;
  startTime: string;
  restartCount: number;
  volumes: {
    name: string;
    persistentVolumeClaim: string;
  }[];
  containerStatuses: V1ContainerStatus[];
};
export type PodsState = {
  list: Pod[];
};
export default function reducer(
  state: PodsState = defaultState,
  action: any = {},
) {
  switch (action.type) {
    case SET_PODS:
      return { ...state, list: action.payload };

    default:
      return state;
  }
} // Action Creators

export const fetchPodsAction = () => {
  return {
    type: FETCH_PODS,
  };
};
export const setPodsAction = (payload: Pod[]) => {
  return {
    type: SET_PODS,
    payload,
  };
};
// Sagas
export function* fetchPods(): Generator<Effect, void, APIResult<V1PodList>> {
  const result = yield call(CoreApi.getPods);

  if (!result.error) {
    yield put(
      setPodsAction(
        result.body.items.map((pod: V1Pod) => ({
          name: pod.metadata.name,
          namespace: pod.metadata.namespace,
          nodeName: pod.spec.nodeName,
          status: pod.status.phase,
          startTime: pod.status.startTime,
          restartCount:
            pod.status.containerStatuses && pod.status.containerStatuses.length
              ? pod.status.containerStatuses[0].restartCount
              : 0,
          volumes: (pod?.spec?.volumes ?? []).map((volume) => ({
            name: volume.name,
            persistentVolumeClaim: volume?.persistentVolumeClaim?.claimName,
          })),
          containerStatuses: pod?.status?.containerStatuses,
        })),
      ),
    );
  }
}
export function* podsSaga(): Generator<Effect, void, void> {
  yield takeLatest(FETCH_PODS, fetchPods);
}