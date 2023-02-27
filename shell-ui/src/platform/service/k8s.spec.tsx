import '../library';
import React, { createContext, useContext } from 'react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { getNodesCountQuery, getVolumesCountQuery } from './k8s';
import { afterAll, beforeAll, jest } from '@jest/globals';
const k8sUrl = 'https://10.0.0.1:8443/api/kubernetes';
const nodes = {
  kind: 'NodeList',
  apiVersion: 'v1',
  metadata: {
    selfLink: '/api/v1/nodes',
    resourceVersion: '8885971',
  },
  items: [{}],
};
const persistentvolumes = {
  kind: 'PersistentVolumeList',
  apiVersion: 'v1',
  metadata: {
    selfLink: '/api/v1/persistentvolumes',
    resourceVersion: '9186732',
  },
  items: [{}, {}, {}, {}, {}],
};
const token = 'eyxxxx';
const server = setupServer(
  rest.get(`${k8sUrl}/api/v1/nodes`, (req, res, ctx) => {
    return res(ctx.json(nodes));
  }),
  rest.get(`${k8sUrl}/api/v1/persistentvolumes`, (req, res, ctx) => {
    return res(ctx.json(persistentvolumes));
  }),
);
describe('getNodesCount', () => {
  jest.useFakeTimers();
  beforeAll(() =>
    server.listen({
      onUnhandledRequest: 'error',
    }),
  );
  afterEach(() => server.resetHandlers());

  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );

  it('should return the number of nodes in the cluster', async () => {
    // S
    const { result, waitForNextUpdate } = renderHook(
      () => useQuery(getNodesCountQuery(k8sUrl, token)),
      {
        wrapper,
      },
    );
    // E
    await waitForNextUpdate();
    // V
    expect(result.current.data).toEqual(1);
  });
  it('should return the number of volumes in the cluster', async () => {
    // S
    const { result, waitForNextUpdate } = renderHook(
      () => useQuery(getVolumesCountQuery(k8sUrl, token)),
      {
        wrapper,
      },
    );
    // E
    await waitForNextUpdate();
    // V
    expect(result.current.data).toEqual(5);
  });
  afterAll(() => {
    server.close();
  });
});