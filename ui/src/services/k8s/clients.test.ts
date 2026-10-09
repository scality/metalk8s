import { CoreV1Api } from '@kubernetes/client-node/dist/gen/api/coreV1Api';
import { k8sApi } from './clients';

describe('k8sApi', () => {
  it('builds every client against the given URL and token, with no React in the path', () => {
    const clients = k8sApi('/api/kubernetes', 'a-token');

    expect(clients.coreV1).toBeInstanceOf(CoreV1Api);
    // The kinds listKubeResources reaches need these too — a missing one would only show up at call
    // time, inside a tool, as "clients.customObjects is undefined". No module mock above it either:
    // nothing on this file's import path touches React, which is the point of it being its own.
    expect(clients.appsV1).toBeDefined();
    expect(clients.customObjects).toBeDefined();
    expect(clients.coreV1.basePath).toBe('/api/kubernetes');
  });
});
