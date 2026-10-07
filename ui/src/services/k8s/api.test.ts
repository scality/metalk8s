import { CoreV1Api } from '@kubernetes/client-node/dist/gen/api/coreV1Api';
import { k8sApi } from './api';

jest.mock('../../containers/PrivateRoute', () => ({ useAuth: jest.fn() }));

describe('k8sApi', () => {
  it('builds every client against the given URL and token, with no React in the path', () => {
    const clients = k8sApi('/api/kubernetes', 'a-token');

    expect(clients.coreV1).toBeInstanceOf(CoreV1Api);
    // The kinds listKubeResources reaches need these three too — a missing one would only show up
    // at call time, inside a tool, as "clients.batchV1 is undefined".
    expect(clients.appsV1).toBeDefined();
    expect(clients.batchV1).toBeDefined();
    expect(clients.batchV1beta1).toBeDefined();
    expect(clients.customObjects).toBeDefined();
    expect(clients.coreV1.basePath).toBe('/api/kubernetes');
  });
});
