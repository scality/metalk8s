import type { K8sApiClients } from './clients';
import { type DescribeTarget, describeResource, discoverTarget, MAX_EVENTS, resolveDescribeRequest } from './describe';

const apiRejection = (statusCode: number) => ({ response: { statusCode }, body: {} });
const events = (items: unknown[]) => Promise.resolve({ response: { statusCode: 200 }, body: { items } });

/** Answers clients.json by path: a plain value resolves, a `{ response }` rejects, anything else is a 404. */
const makeClients = (routes: Record<string, unknown> = {}) =>
  ({
    coreV1: {
      listNamespacedEvent: jest.fn().mockReturnValue(events([])),
      listEventForAllNamespaces: jest.fn().mockReturnValue(events([])),
    },
    json: jest.fn(async (path: string) => {
      if (!(path in routes)) throw apiRejection(404);
      const answer = routes[path];
      if (answer && typeof answer === 'object' && 'response' in answer) throw answer;
      return answer;
    }),
  }) as unknown as K8sApiClients;

const target = (kind: string, apiVersion: string, namespaced: boolean): DescribeTarget => ({
  ...resolveDescribeRequest(kind, apiVersion),
  namespaced,
});
const PODS = target('pods', 'v1', true);
const NODES = target('nodes', 'v1', false);
const POD_PATH = '/api/v1/namespaces/default/pods/web-abc';

const pod = () => ({
  metadata: { name: 'web-abc', namespace: 'default', uid: 'uid-1' },
  spec: { nodeName: 'node-1', containers: [{ name: 'web' }] },
  status: { phase: 'Running', containerStatuses: [{ ready: true, restartCount: 0, state: { running: {} } }] },
});

describe('resolveDescribeRequest', () => {
  it.each([
    ['pods', 'v1', '/api/v1'],
    ['deployments', 'apps/v1', '/apis/apps/v1'],
    ['volumes', 'storage.metalk8s.scality.com/v1alpha1', '/apis/storage.metalk8s.scality.com/v1alpha1'],
  ])('builds the API path for %s at %s', (kind, apiVersion, base) => {
    expect(resolveDescribeRequest(kind, apiVersion)).toEqual({ kind, apiVersion, base });
  });

  it('requires an apiVersion for every kind, the core ones included', () => {
    expect(() => resolveDescribeRequest('pods', undefined)).toThrow(
      expect.objectContaining({ status: 'malformed', detail: expect.stringMatching(/"v1"/) }),
    );
  });

  it("resolves kubectl's short names to the plural that goes into the path", () => {
    expect(resolveDescribeRequest('PVC', 'v1').kind).toBe('persistentvolumeclaims');
  });

  it.each(['../../../api/v1/secrets', 'volumes.storage', 'pods/log'])('refuses %s as a plural', (kind) => {
    expect(() => resolveDescribeRequest(kind, 'v1')).toThrow(expect.objectContaining({ status: 'malformed' }));
  });

  it.each(['not/an/apiversion', '/v1', 'apps'])('refuses %s as an apiVersion', (apiVersion) => {
    expect(() => resolveDescribeRequest('pods', apiVersion)).toThrow(expect.objectContaining({ status: 'malformed' }));
  });
});

describe('discoverTarget', () => {
  it('takes the scope from what the API server says it serves', async () => {
    const clients = makeClients({
      '/apis/storage.metalk8s.scality.com/v1alpha1': {
        resources: [
          { name: 'volumes', namespaced: false },
          { name: 'volumes/status', namespaced: false },
        ],
      },
    });

    const discovered = await discoverTarget(
      clients,
      resolveDescribeRequest('volumes', 'storage.metalk8s.scality.com/v1alpha1'),
    );

    expect(discovered).toMatchObject({ kind: 'volumes', namespaced: false });
  });

  it('says when the apiVersion is served but the kind is not', async () => {
    const clients = makeClients({ '/apis/apps/v1': { resources: [{ name: 'deployments', namespaced: true }] } });

    await expect(discoverTarget(clients, resolveDescribeRequest('widgets', 'apps/v1'))).rejects.toMatchObject({
      status: 'not_found',
      detail: expect.stringMatching(/"widgets" is not served at apps\/v1/),
    });
  });

  it('says when the apiVersion itself is not served', async () => {
    const clients = makeClients();

    await expect(discoverTarget(clients, resolveDescribeRequest('widgets', 'example.com/v1'))).rejects.toMatchObject({
      status: 'not_found',
      detail: expect.stringMatching(/example\.com\/v1 is not served/),
    });
  });

  it('keeps a forbidden discovery apart from a missing one', async () => {
    const clients = makeClients({ '/apis/apps/v1': apiRejection(403) });

    await expect(discoverTarget(clients, resolveDescribeRequest('deployments', 'apps/v1'))).rejects.toMatchObject({
      status: 'not_authorized',
    });
  });
});

describe('describeResource', () => {
  const describePod = (clients: K8sApiClients, params: Record<string, unknown> = {}) =>
    describeResource(clients, PODS, { name: 'web-abc', namespace: 'default', ...params });

  it('hands the object over as the API returned it', async () => {
    const object = {
      metadata: {
        name: 'web-abc',
        namespace: 'default',
        uid: 'uid-1',
        labels: { app: 'web' },
        managedFields: [{ manager: 'kubelet', fieldsV1: { 'f:status': {} } }],
      },
      spec: { nodeName: 'node-1', containers: [{ name: 'web', image: 'registry/web:1' }] },
      status: {
        phase: 'Running',
        containerStatuses: [
          { name: 'web', ready: true, restartCount: 7, lastState: { terminated: { exitCode: 1, reason: 'Error' } } },
        ],
      },
    };
    const clients = makeClients({ [POD_PATH]: object });

    const description = await describePod(clients);

    expect(clients.json).toHaveBeenCalledWith(POD_PATH);
    // Whole, managed fields included: what a particular caller may not show is that caller's
    // business, and this one has none. Why the container last stopped is in there too.
    expect(description.resource).toEqual(object);
    expect(description).toMatchObject({ kind: 'pods', apiVersion: 'v1', name: 'web-abc', namespace: 'default' });
    expect(description).not.toHaveProperty('summary');
  });

  it.each([
    ['deployments', 'apps/v1', 'default', '/apis/apps/v1/namespaces/default/deployments/web'],
    ['cronjobs', 'batch/v1', 'default', '/apis/batch/v1/namespaces/default/cronjobs/web'],
    [
      'volumes',
      'storage.metalk8s.scality.com/v1alpha1',
      undefined,
      '/apis/storage.metalk8s.scality.com/v1alpha1/volumes/web',
    ],
  ])('reads %s at %s by the same route as every other kind', async (kind, apiVersion, namespace, path) => {
    const clients = makeClients({ [path]: { metadata: { name: 'web', uid: 'uid-w' } } });

    await describeResource(clients, target(kind, apiVersion, namespace !== undefined), { name: 'web', namespace });

    expect(clients.json).toHaveBeenCalledWith(path);
  });

  it('asks for the events of this object, by uid as well as name', async () => {
    const clients = makeClients({ [POD_PATH]: pod() });
    (clients.coreV1.listNamespacedEvent as jest.Mock).mockReturnValue(
      events([
        {
          type: 'Warning',
          reason: 'BackOff',
          message: 'Back-off restarting failed container',
          series: { count: 12, lastObservedTime: new Date('2026-10-06T09:14:22Z') },
        },
      ]),
    );

    const description = await describePod(clients);

    // The uid is what stops a Service's events being reported against a Pod of the same name.
    expect(clients.coreV1.listNamespacedEvent).toHaveBeenCalledWith(
      'default',
      undefined,
      undefined,
      undefined,
      'involvedObject.name=web-abc,involvedObject.uid=uid-1',
    );
    // Dated and counted off `series`, which is all an events.k8s.io/v1 writer leaves here.
    expect(description.events).toEqual([
      {
        type: 'Warning',
        reason: 'BackOff',
        count: 12,
        lastSeen: '2026-10-06T09:14:22.000Z',
        message: 'Back-off restarting failed container',
      },
    ]);
  });

  it("reads a node's events across every namespace, by kind rather than uid", async () => {
    const clients = makeClients({
      '/api/v1/nodes/node-1': { metadata: { name: 'node-1', uid: 'uid-n' }, spec: {}, status: {} },
    });

    await describeResource(clients, NODES, { name: 'node-1' });

    // A node has no namespace of its own, so its events cannot be looked for in one. And no uid:
    // the kubelet writes a node's own events with involvedObject.uid set to the node NAME, so
    // filtering on the real uid would keep the node controller's events and drop every Starting,
    // NodeReady and Rebooted the kubelet recorded. The kind is pinned instead.
    expect(clients.coreV1.listEventForAllNamespaces).toHaveBeenCalledWith(
      undefined,
      'involvedObject.name=node-1,involvedObject.kind=Node',
    );
    expect(clients.coreV1.listNamespacedEvent).not.toHaveBeenCalled();
  });

  it("keeps the uid for any other cluster-scoped object's events", async () => {
    const path = '/apis/storage.metalk8s.scality.com/v1alpha1/volumes/volume-1';
    const clients = makeClients({ [path]: { metadata: { name: 'volume-1', uid: 'uid-v' } } });

    await describeResource(clients, target('volumes', 'storage.metalk8s.scality.com/v1alpha1', false), {
      name: 'volume-1',
    });

    expect(clients.coreV1.listEventForAllNamespaces).toHaveBeenCalledWith(
      undefined,
      'involvedObject.name=volume-1,involvedObject.uid=uid-v',
    );
  });

  it('still describes the object when the events cannot be read', async () => {
    const clients = makeClients({ [POD_PATH]: pod() });
    (clients.coreV1.listNamespacedEvent as jest.Mock).mockRejectedValue(apiRejection(403));

    const description = await describePod(clients);

    expect(description.resource.status).toMatchObject({ phase: 'Running' });
    // null, and a reason — never an empty array, which would read as "nothing has happened".
    expect(description.events).toBeNull();
    expect(description.eventsUnavailable).toMatch(/not_authorized/);
  });

  it('skips the events call entirely when it is not asked for', async () => {
    const clients = makeClients({ [POD_PATH]: pod() });

    const description = await describePod(clients, { includeEvents: false });

    expect(clients.coreV1.listNamespacedEvent).not.toHaveBeenCalled();
    expect(description.events).toBeNull();
  });

  it('keeps the newest events when there are more than it returns', async () => {
    const clients = makeClients({ [POD_PATH]: pod() });
    (clients.coreV1.listNamespacedEvent as jest.Mock).mockReturnValue(
      events(
        // Oldest first, which is how etcd key order tends to leave them.
        Array.from({ length: MAX_EVENTS + 2 }, (_, i) => ({
          reason: `event-${i}`,
          lastTimestamp: new Date(2026, 0, 1, 0, 0, i),
        })),
      ),
    );

    const description = await describePod(clients);

    expect(description.truncated).toBe(true);
    expect(description.events).toHaveLength(MAX_EVENTS);
    expect(description.events?.[0]).toMatchObject({ reason: `event-${MAX_EVENTS + 1}` });
  });

  it.each([
    [401, 'session_expired'],
    [403, 'not_authorized'],
    [404, 'not_found'],
    [500, 'unavailable'],
  ])('maps HTTP %i to %s, keeping them apart', async (statusCode, status) => {
    const clients = makeClients({ [POD_PATH]: apiRejection(statusCode) });

    await expect(describePod(clients)).rejects.toMatchObject({ status });
  });

  it('calls a 200 that is not an object malformed', async () => {
    const clients = makeClients({ [POD_PATH]: { kind: 'Status', message: 'nope' } });

    await expect(describePod(clients)).rejects.toMatchObject({ status: 'malformed' });
  });

  it.each([
    '../../../api/v1/secrets/admin',
    'web/../../secrets',
    'Web-ABC',
    '',
  ])('refuses %s as a name, rather than trusting it to be encoded', async (name) => {
    const clients = makeClients();

    await expect(describePod(clients, { name })).rejects.toMatchObject({ status: 'malformed' });
    expect(clients.json).not.toHaveBeenCalled();
  });

  it('refuses a namespace that is not one', async () => {
    const clients = makeClients();

    await expect(describePod(clients, { namespace: '../kube-system' })).rejects.toMatchObject({
      status: 'malformed',
    });
    expect(clients.json).not.toHaveBeenCalled();
  });

  it('requires a namespace for a namespaced kind', async () => {
    const clients = makeClients();

    await expect(describePod(clients, { namespace: undefined })).rejects.toMatchObject({ status: 'malformed' });
    expect(clients.json).not.toHaveBeenCalled();
  });

  it.each([
    ['null', null],
    ['an empty string', ''],
  ])('takes %s as no namespace, as models send for an optional field', async (_, namespace) => {
    const clients = makeClients({ '/api/v1/nodes/node-1': { metadata: { name: 'node-1', uid: 'uid-n' } } });

    await describeResource(clients, NODES, { name: 'node-1', namespace: namespace as unknown as string });

    expect(clients.json).toHaveBeenCalledWith('/api/v1/nodes/node-1');
  });

  it('still requires a namespace for a namespaced kind when it arrives as null', async () => {
    const clients = makeClients();

    await expect(describePod(clients, { namespace: null })).rejects.toMatchObject({
      status: 'malformed',
      detail: expect.stringMatching(/namespace is required/),
    });
    expect(clients.json).not.toHaveBeenCalled();
  });

  it('refuses a namespace on a cluster-scoped kind rather than ignoring it', async () => {
    const clients = makeClients();

    // Ignoring it would answer about a different object than the caller believes it asked for.
    await expect(describeResource(clients, NODES, { name: 'node-1', namespace: 'default' })).rejects.toMatchObject({
      status: 'malformed',
      detail: expect.stringMatching(/cluster-scoped/),
    });
    expect(clients.json).not.toHaveBeenCalled();
  });
});
