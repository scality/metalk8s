import { call, put } from 'redux-saga/effects';
import { fetchPods, SET_PODS } from './pods';
import * as CoreApi from '../../services/k8s/core';
it('update the pods state when fetchPods', () => {
  const gen = fetchPods();
  expect(gen.next().value).toEqual(call(CoreApi.getPods));
  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'coredns',
            namespace: 'kube-system',
          },
          status: {
            phase: 'Running',
            startTime: '2019-29-03',
            containerStatuses: [
              {
                restartCount: '2',
                ready: true,
              },
            ],
          },
          spec: {
            nodeName: 'bootstrap',
          },
        },
      ],
    },
  };
  const pods = [
    {
      name: 'coredns',
      namespace: 'kube-system',
      nodeName: 'bootstrap',
      status: 'Running',
      startTime: '2019-29-03',
      restartCount: '2',
      containerStatuses: [
        {
          restartCount: '2',
          ready: true,
        },
      ],
      volumes: [],
    },
  ];
  expect(gen.next(result).value).toEqual(
    put({
      type: SET_PODS,
      payload: pods,
    }),
  );
});