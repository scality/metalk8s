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
    // Whole, managed fields included: one object fits, and a reader of it knows Kubernetes. Why the
    // container last stopped is in there too, where the API put it.
    expect(description.resource).toEqual(object);
    expect(description.omitted).toEqual([]);
    // No summary beside it — the row a listing would give for this object is a subset of what is
    // already here, and a reader that can read the object does not need it read out first.
    expect(description).not.toHaveProperty('summary');
  });

  it('sheds its known bulk only once the object is outsized, and names what it shed', async () => {
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(
      ok(
        pod({
          metadata: {
            name: 'web-abc',
            namespace: 'default',
            uid: 'uid-1',
            labels: { app: 'web' },
            // Grown over a year of updates, and the first thing worth losing.
            managedFields: Array.from({ length: 40 }, () => ({ manager: 'x'.repeat(4096) })),
          },
        }),
      ),
    );

    const description = await describePod();

    expect(description.resource.metadata).not.toHaveProperty('managedFields');
    expect(description.resource.metadata).toMatchObject({ labels: { app: 'web' } });
    expect(description.omitted).toContain('metadata.managedFields');
  });

  it("sheds a node's image list once that is what makes it outsized", async () => {
    (clients.coreV1.readNode as jest.Mock).mockReturnValue(
      ok({
        metadata: { name: 'node-1', labels: {} },
        spec: {},
        status: {
          conditions: [{ type: 'Ready', status: 'True' }],
          // Every image on the box, with every tag it answers to.
          images: Array.from({ length: 200 }, (_, i) => ({
            names: [`registry/image-${i}@sha256:${'a'.repeat(700)}`],
          })),
        },
      }),
    );

    const description = await describeResource(clients, resolveTarget('nodes'), { name: 'node-1' });

    expect(description.resource.status).not.toHaveProperty('images');
    expect(description.resource.status).toMatchObject({ conditions: [{ type: 'Ready' }] });
    expect(description.omitted).toContain('status.images');
  });

  it('keeps env names and drops their values', async () => {
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(
      ok(
        pod({
          spec: {
            containers: [
              {
                name: 'web',
                env: [
                  { name: 'DB_PASSWORD', value: 'hunter2' },
                  { name: 'DB_HOST', valueFrom: { configMapKeyRef: { name: 'cfg', key: 'host' } } },
                ],
              },
            ],
          },
        }),
      ),
    );

    const description = await describePod();

    // Not a size measure, so it does not wait for the object to be big.
    expect(JSON.stringify(description)).not.toContain('hunter2');
    expect(description.resource.spec).toMatchObject({
      containers: [
        {
          env: [
            { name: 'DB_PASSWORD' },
            // A reference is not a value: it says where the variable comes from, which is the half
            // worth having.
            { name: 'DB_HOST', valueFrom: { configMapKeyRef: { name: 'cfg', key: 'host' } } },
          ],
        },
      ],
    });
    expect(description.omitted).toContain('env values (names kept)');
  });

  it.each([
    [
      'a deployment, whose containers are under spec.template.spec',
      'deployments',
      { spec: { template: { spec: { containers: [{ name: 'web', env: [{ name: 'PW', value: 'hunter2' }] }] } } } },
    ],
    [
      'a cronjob, two templates deep',
      'cronjobs',
      {
        spec: {
          jobTemplate: {
            spec: { template: { spec: { containers: [{ name: 'job', env: [{ name: 'PW', value: 'hunter2' }] }] } } },
          },
        },
      },
    ],
  ])('keeps env values out of %s', async (_, kind, body) => {
    // Every kind puts its pod template somewhere different, and reaching for the pod path would
    // have handed a Deployment's env values over in full.
    (clients.customObjects.getNamespacedCustomObject as jest.Mock).mockReturnValue(
      ok({ metadata: { name: 'thing', namespace: 'default' }, ...body }),
    );

    const description = await describeResource(clients, resolveTarget(kind), {
      name: 'thing',
      namespace: 'default',
    });

    expect(JSON.stringify(description)).not.toContain('hunter2');
    expect(JSON.stringify(description)).toContain('"PW"');
    expect(description.omitted).toContain('env values (names kept)');
  });

  it('never returns the annotation holding a copy of the applied spec', async () => {
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(
      ok(
        pod({
          metadata: {
            name: 'web-abc',
            namespace: 'default',
            uid: 'uid-1',
            annotations: {
              // kubectl apply writes the whole spec back verbatim, env values and all — redacting
              // the spec and leaving this behind would hand them over anyway.
              'kubectl.kubernetes.io/last-applied-configuration':
                '{"spec":{"containers":[{"name":"web","env":[{"name":"PW","value":"hunter2"}]}]}}',
              'other/annotation': 'kept',
            },
          },
        }),
      ),
    );

    const description = await describePod();

    expect(JSON.stringify(description)).not.toContain('hunter2');
    expect(description.resource.metadata?.annotations).toEqual({ 'other/annotation': 'kept' });
    expect(description.omitted).toContain('metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]');
  });

  it('leaves dates alone while walking the object', async () => {
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(
      ok(
        pod({
          metadata: {
            name: 'web-abc',
            namespace: 'default',
            uid: 'uid-1',
            creationTimestamp: new Date('2026-10-02T08:11:04Z'),
          },
        }),
      ),
    );

    const description = await describePod();

    // A Date has no own entries, so walking one without a guard turns it into {}.
    expect((description.resource.metadata as { creationTimestamp: Date }).creationTimestamp).toEqual(
      new Date('2026-10-02T08:11:04Z'),
    );
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
