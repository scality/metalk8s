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
            name: 'boostrap'
          },
          status: {
            capacity: {
              cpu: '2',
              memory: '1000ki',
              pods: '110'
            }
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
      pods: '110'
    }
  ];

  expect(gen.next(result).value).toEqual(
    put({ type: SET_NODES, payload: nodes })
  );
});
