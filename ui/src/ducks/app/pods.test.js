import { call, put } from 'redux-saga/effects';
import { fetchPods, SET_PODS } from './pods';
import * as Api from '../../services/api';

it('update the pods state when fetchPods', () => {
  const gen = fetchPods();

  expect(gen.next().value).toEqual(call(Api.getPods));

  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'coredns',
            namespace: 'kube-system'
          },
          status: {
            phase: 'Running',
            startTime: '2019-29-03',
            containerStatuses: [
              {
                restartCount: '2'
              }
            ]
          },
          spec: {
            nodeName: 'bootstrap'
          }
        }
      ]
    }
  };

  const pods = [
    {
      name: 'coredns',
      namespace: 'kube-system',
      nodeName: 'bootstrap',
      status: 'Running',
      startTime: '2019-29-03',
      restartCount: '2'
    }
  ];

  expect(gen.next(result).value).toEqual(
    put({ type: SET_PODS, payload: pods })
  );
});
