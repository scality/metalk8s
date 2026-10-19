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

describe('k8sApi().text', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  const answer = (status: number, body: string) =>
    Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(body) });

  it('returns what the server wrote, without asking it to be JSON', async () => {
    fetchMock.mockReturnValue(answer(200, 'not json, a log line\n'));

    const body = await k8sApi('/api/kubernetes', 'a-token').text('/api/v1/namespaces/default/pods/web/log', {
      tailLines: 200,
      container: undefined,
    });

    expect(body).toBe('not json, a log line\n');
    const [url, init] = fetchMock.mock.calls[0];
    // undefined is left out rather than sent as the string "undefined".
    expect(url).toBe('/api/kubernetes/api/v1/namespaces/default/pods/web/log?tailLines=200');
    expect(init.headers.authorization).toBe('Bearer a-token');
  });

  it('rejects the way the generated clients do, carrying the message the API gave', async () => {
    fetchMock.mockReturnValue(answer(400, JSON.stringify({ message: 'previous terminated container not found' })));

    // One failure mapping covers both: statusCode where failureFor looks for it, body.message where
    // the log read looks for it.
    await expect(k8sApi('/api/kubernetes', 'a-token').text('/api/v1/x')).rejects.toMatchObject({
      response: { statusCode: 400 },
      body: { message: 'previous terminated container not found' },
    });
  });

  it('keeps an error body that is not JSON rather than losing it', async () => {
    fetchMock.mockReturnValue(answer(503, 'upstream connect error'));

    await expect(k8sApi('/api/kubernetes', 'a-token').text('/api/v1/x')).rejects.toMatchObject({
      body: 'upstream connect error',
    });
  });
});
