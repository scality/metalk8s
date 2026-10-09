import type { K8sApiClients } from './api';
import { describeResource, MAX_EVENTS } from './describe';
import { resolveTarget } from './resources';

const makeClients = () =>
  ({
    coreV1: {
      readNamespacedPod: jest.fn(),
      readNode: jest.fn(),
      readNamespacedConfigMap: jest.fn(),
      listNamespacedEvent: jest.fn(),
      listEventForAllNamespaces: jest.fn(),
    },
    appsV1: { readNamespacedDeployment: jest.fn() },
    batchV1: {},
    customObjects: { getNamespacedCustomObject: jest.fn() },
  }) as unknown as K8sApiClients;

const ok = (body: unknown) => Promise.resolve({ response: { statusCode: 200 }, body });
const events = (items: unknown[]) => Promise.resolve({ response: { statusCode: 200 }, body: { items } });
const apiRejection = (statusCode: number) => ({ response: { statusCode }, body: {} });

const pod = (overrides: Record<string, unknown> = {}) => ({
  metadata: { name: 'web-abc', namespace: 'default', uid: 'uid-1' },
  spec: { nodeName: 'node-1', containers: [{ name: 'web' }] },
  status: { phase: 'Running', containerStatuses: [{ ready: true, restartCount: 0, state: { running: {} } }] },
  ...overrides,
});

describe('describeResource', () => {
  let clients: K8sApiClients;

  beforeEach(() => {
    clients = makeClients();
    (clients.coreV1.listNamespacedEvent as jest.Mock).mockReturnValue(events([]));
    (clients.coreV1.listEventForAllNamespaces as jest.Mock).mockReturnValue(events([]));
  });

  const describePod = (params: Record<string, unknown> = {}) =>
    describeResource(clients, resolveTarget('pods'), { name: 'web-abc', namespace: 'default', ...params });

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
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(ok(object));

    const description = await describePod();

    expect(clients.coreV1.readNamespacedPod).toHaveBeenCalledWith('web-abc', 'default');
    // Whole, managed fields included: what a particular caller may not show is that caller's
    // business, and this one has none. Why the container last stopped is in there too.
    expect(description.resource).toEqual(object);
    // No summary beside it — the row a listing would give for this object is a subset of what is
    // already here, and a reader that can read the object does not need it read out first.
    expect(description).not.toHaveProperty('summary');
  });

  it('asks for the events of this object, by uid as well as name', async () => {
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(ok(pod()));
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

    const description = await describePod();

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

  it("reads a cluster-scoped object's events across every namespace", async () => {
    (clients.coreV1.readNode as jest.Mock).mockReturnValue(
      ok({ metadata: { name: 'node-1', uid: 'uid-n', labels: {} }, spec: {}, status: {} }),
    );

    await describeResource(clients, resolveTarget('nodes'), { name: 'node-1' });

    // A node has no namespace of its own, so its events cannot be looked for in one.
    expect(clients.coreV1.listEventForAllNamespaces).toHaveBeenCalledWith(
      undefined,
      'involvedObject.name=node-1,involvedObject.uid=uid-n',
    );
    expect(clients.coreV1.listNamespacedEvent).not.toHaveBeenCalled();
  });

  it('still describes the object when the events cannot be read', async () => {
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(ok(pod()));
    (clients.coreV1.listNamespacedEvent as jest.Mock).mockRejectedValue(apiRejection(403));

    const description = await describePod();

    expect(description.resource.status).toMatchObject({ phase: 'Running' });
    // null, and a reason — never an empty array, which would read as "nothing has happened".
    expect(description.events).toBeNull();
    expect(description.eventsUnavailable).toMatch(/not_authorized/);
  });

  it('skips the events call entirely when it is not asked for', async () => {
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(ok(pod()));

    const description = await describePod({ includeEvents: false });

    expect(clients.coreV1.listNamespacedEvent).not.toHaveBeenCalled();
    expect(description.events).toBeNull();
  });

  it('keeps the newest events when there are more than it returns', async () => {
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(ok(pod()));
    (clients.coreV1.listNamespacedEvent as jest.Mock).mockReturnValue(
      events(
        // Oldest first, which is how etcd key order tends to leave them.
        Array.from({ length: MAX_EVENTS + 2 }, (_, i) => ({
          reason: `event-${i}`,
          lastTimestamp: new Date(2026, 0, 1, 0, 0, i),
        })),
      ),
    );

    const description = await describePod();

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
    (clients.coreV1.readNamespacedPod as jest.Mock).mockRejectedValue(apiRejection(statusCode));

    await expect(describePod()).rejects.toMatchObject({ status });
  });

  it('calls a 200 that is not an object malformed', async () => {
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(ok({ kind: 'Status', message: 'nope' }));

    await expect(describePod()).rejects.toMatchObject({ status: 'malformed' });
  });

  it.each([
    '../../../api/v1/secrets/admin',
    'web/../../secrets',
    'Web-ABC',
    '',
  ])('refuses %s as a name, rather than trusting it to be encoded', async (name) => {
    await expect(describePod({ name })).rejects.toMatchObject({ status: 'malformed' });
    expect(clients.coreV1.readNamespacedPod).not.toHaveBeenCalled();
  });

  it('refuses a namespace that is not one', async () => {
    await expect(describePod({ namespace: '../kube-system' })).rejects.toMatchObject({ status: 'malformed' });
    expect(clients.coreV1.readNamespacedPod).not.toHaveBeenCalled();
  });

  it('requires a namespace for a namespaced kind', async () => {
    await expect(describePod({ namespace: undefined })).rejects.toMatchObject({ status: 'malformed' });
    expect(clients.coreV1.readNamespacedPod).not.toHaveBeenCalled();
  });

  it('refuses a namespace on a cluster-scoped kind rather than ignoring it', async () => {
    // Ignoring it would answer about a different object than the caller believes it asked for.
    await expect(
      describeResource(clients, resolveTarget('nodes'), { name: 'node-1', namespace: 'default' }),
    ).rejects.toMatchObject({ status: 'malformed' });
    expect(clients.coreV1.readNode).not.toHaveBeenCalled();
  });

  it('reads a cronjob at batch/v1, the version the API server serves', async () => {
    (clients.customObjects.getNamespacedCustomObject as jest.Mock).mockReturnValue(
      ok({ metadata: { name: 'backup', namespace: 'default' }, spec: { schedule: '0 2 * * *' }, status: {} }),
    );

    const description = await describeResource(clients, resolveTarget('cronjobs'), {
      name: 'backup',
      namespace: 'default',
    });

    expect(clients.customObjects.getNamespacedCustomObject).toHaveBeenCalledWith(
      'batch',
      'v1',
      'default',
      'cronjobs',
      'backup',
    );
    expect(description.resource.spec).toMatchObject({ schedule: '0 2 * * *' });
  });

  it('cannot describe a kind reached only by apiVersion, and says so', async () => {
    await expect(
      describeResource(clients, resolveTarget('volumes', 'storage.metalk8s.scality.com/v1alpha1'), {
        name: 'volume-1',
      }),
    ).rejects.toMatchObject({ status: 'not_found' });
  });
});
