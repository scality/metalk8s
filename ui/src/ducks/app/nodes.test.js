import { call, put } from 'redux-saga/effects';
import { fetchNodes, SET_NODES } from './nodes';
import * as Api from '../../services/api';

it('update the nodes state when fetchNodes', () => {
  const gen = fetchNodes();

  expect(gen.next().value).toEqual(call(Api.getNodes));

  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'boostrap',
            creationTimestamp: '2019-29-03'
          },
          status: {
            capacity: {
              cpu: '2',
              memory: '1000ki'
            },
            conditions: [
              {
                type: 'Ready',
                status: 'True'
              }
            ]
          }
        }
      ]
    }
  };

  const nodes = [
    {
      name: 'boostrap',
      cpu: '2',
      memory: '1000 KiB',
      creationDate: '2019-29-03',
      status: 'Ready'
    }
  ];

  expect(gen.next(result).value).toEqual(
    put({ type: SET_NODES, payload: nodes })
  );
});
