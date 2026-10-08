import type { K8sApiClients } from './api';
import { ALLOWED_KINDS, listResources, MAX_ITEMS, resolveTarget } from './resources';

const makeClients = () =>
  ({
    coreV1: {
      listPodForAllNamespaces: jest.fn(),
      listNode: jest.fn(),
      listConfigMapForAllNamespaces: jest.fn(),
      listEventForAllNamespaces: jest.fn(),
      listPersistentVolumeClaimForAllNamespaces: jest.fn(),
    },
    appsV1: { listDeploymentForAllNamespaces: jest.fn() },
    batchV1: { listJobForAllNamespaces: jest.fn() },
    customObjects: { listClusterCustomObject: jest.fn() },
  }) as unknown as K8sApiClients;

/** What the client rejects with: `{ response, body }`, not an Error subclass. */
const apiRejection = (statusCode: number) => ({ response: { statusCode }, body: {} });

const ok = (items: unknown[]) => Promise.resolve({ response: { statusCode: 200 }, body: { items } });

describe('resolveTarget', () => {
  it('refuses an unknown kind with no apiVersion, before anything is sent', () => {
    expect(() => resolveTarget('widgets')).toThrow(expect.objectContaining({ status: 'not_found' }));
  });

  it('maps an allowlisted kind to its typed client and its own apiVersion', () => {
    const target = resolveTarget('deployments');

    expect(target.apiVersion).toBe('apps/v1');
    expect(target.namespaced).toBe(true);
    expect(target.entry).toBeDefined();
    expect(target.custom).toBeUndefined();
  });

  it('sends an unknown kind with an apiVersion to custom objects, group and version split', () => {
    const target = resolveTarget('volumes', 'storage.metalk8s.scality.com/v1alpha1');

    expect(target.entry).toBeUndefined();
    expect(target.custom).toEqual({
      group: 'storage.metalk8s.scality.com',
      version: 'v1alpha1',
      plural: 'volumes',
    });
  });

  it('reaches a built-in kind outside the allowlist, not just custom resources', () => {
    // CustomObjectsApi serves any API group, so the escape hatch is not limited to CRDs — and the
    // tool's description says so. This is what makes that true.
    const target = resolveTarget('ingresses', 'networking.k8s.io/v1');

    expect(target.custom).toEqual({
      group: 'networking.k8s.io',
      version: 'v1',
      plural: 'ingresses',
    });
  });

  it('tells a caller naming an unknown kind how to reach it, not only that it failed', () => {
    expect(() => resolveTarget('ingresses')).toThrow(/apiVersion/);
    // Named explicitly, because "custom resource" alone reads as "built-in kinds are out of reach".
    expect(() => resolveTarget('ingresses')).toThrow(/built-in/i);
  });

  it.each([
    '../../../api/v1/secrets',
    '..%2F..%2Fapi%2Fv1%2Fsecrets',
    'volumes/../../secrets',
    'volumes.storage',
  ])('refuses %s as a plural, rather than trusting it to be encoded', (plural) => {
    // group and version are checked by parseApiVersion; this is the remaining path segment, and the
    // only one the caller writes freely. A resource plural is a DNS label and nothing else.
    expect(() => resolveTarget(plural, 'apps/v1')).toThrow(expect.objectContaining({ status: 'malformed' }));
  });

  it('still accepts a plural however it was capitalised', () => {
    // Case is normalised on the way in, so it is not what makes a plural invalid.
    expect(resolveTarget('Volumes', 'storage.metalk8s.scality.com/v1alpha1').custom?.plural).toBe('volumes');
  });

  it('refuses an apiVersion that is not one', () => {
    expect(() => resolveTarget('volumes', 'not/an/apiversion')).toThrow(
      expect.objectContaining({ status: 'malformed' }),
    );
    expect(() => resolveTarget('volumes', '/v1alpha1')).toThrow(expect.objectContaining({ status: 'malformed' }));
  });

  it('refuses a bare core version for a kind it does not know: custom resources have a group', () => {
    expect(() => resolveTarget('endpoints', 'v1')).toThrow(expect.objectContaining({ status: 'not_found' }));
  });

  it('does not offer secrets among the kinds it lists', () => {
    expect(ALLOWED_KINDS).not.toContain('secrets');
  });

  it('holds no opinion about secrets — that belongs to whoever is asking', () => {
    // Deliberately not refused here. Never returning a Secret is listKubeResources' policy, and this
    // service has other possible callers; the tool refuses before anything reaches this function.
    expect(() => resolveTarget('secrets', 'v1')).toThrow(expect.objectContaining({ status: 'not_found' }));
    expect(resolveTarget('secrets', 'example.com/v1').custom).toEqual({
      group: 'example.com',
      version: 'v1',
      plural: 'secrets',
    });
  });
});

describe('listResources', () => {
  let clients: K8sApiClients;

  beforeEach(() => {
    clients = makeClients();
  });

  it('projects a pod down to the fields that say whether it is healthy', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: {
            name: 'storage-operator-7d9f',
            namespace: 'metalk8s-system',
            creationTimestamp: new Date('2026-10-02T08:11:04Z'),
          },
          spec: { nodeName: 'node-2', containers: [{ name: 'operator' }] },
          status: {
            phase: 'Running',
            containerStatuses: [{ ready: false, restartCount: 47, state: { waiting: { reason: 'CrashLoopBackOff' } } }],
          },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list).toEqual({
      kind: 'pods',
      namespace: 'all',
      returned: 1,
      truncated: false,
      items: [
        {
          name: 'storage-operator-7d9f',
          namespace: 'metalk8s-system',
          // The phase says Running. The container reason is the answer anyone wanted.
          status: 'CrashLoopBackOff',
          ready: '0/1',
          restarts: 47,
          node: 'node-2',
          createdAt: '2026-10-02T08:11:04.000Z',
        },
      ],
    });
  });

  it("reads an init container's failure, which the main container hides", async () => {
    // While an init container runs or fails, the main container reports PodInitializing — so
    // without this the answer for a pod stuck on a crash-looping init container is "initializing".
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'migrate-abc', namespace: 'default' },
          spec: { containers: [{ name: 'app' }] },
          status: {
            phase: 'Pending',
            initContainerStatuses: [
              { ready: false, restartCount: 6, state: { waiting: { reason: 'CrashLoopBackOff' } } },
            ],
            containerStatuses: [{ ready: false, restartCount: 0, state: { waiting: { reason: 'PodInitializing' } } }],
          },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list.items[0]).toMatchObject({ status: 'Init:CrashLoopBackOff' });
  });

  it('looks past a running sidecar to the init container that is actually stuck', async () => {
    // A sidecar is an init container with restartPolicy Always: it runs for the pod's whole life, so
    // stopping at it would hide everything listed after it for as long as the pod exists.
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'web-abc', namespace: 'default' },
          spec: { containers: [{ name: 'web' }] },
          status: {
            phase: 'Pending',
            initContainerStatuses: [
              { state: { running: { startedAt: new Date('2026-10-06T09:00:00Z') } } },
              { state: { waiting: { reason: 'CrashLoopBackOff' } } },
            ],
            containerStatuses: [{ ready: false, state: { waiting: { reason: 'PodInitializing' } } }],
          },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list.items[0]).toMatchObject({ status: 'Init:CrashLoopBackOff' });
  });

  it('still says PodInitializing while a plain init container is simply running', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'migrate-xyz', namespace: 'default' },
          spec: { containers: [{ name: 'app' }] },
          status: {
            phase: 'Pending',
            initContainerStatuses: [{ state: { running: {} } }],
            containerStatuses: [{ ready: false, state: { waiting: { reason: 'PodInitializing' } } }],
          },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('pods'));

    // Nothing is wrong here, and skipping the running container must not invent a fault.
    expect(list.items[0]).toMatchObject({ status: 'PodInitializing' });
  });

  it('ignores init containers that have already finished', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'app-xyz', namespace: 'default' },
          spec: { containers: [{ name: 'app' }] },
          status: {
            phase: 'Running',
            initContainerStatuses: [{ state: { terminated: { exitCode: 0, reason: 'Completed' } } }],
            containerStatuses: [{ ready: true, restartCount: 0, state: { running: {} } }],
          },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list.items[0]).toMatchObject({ status: 'Running', ready: '1/1' });
  });

  it('dates an event written through the newer events API, which sets no lastTimestamp', async () => {
    (clients.coreV1.listEventForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'web.17f', namespace: 'default' },
          type: 'Warning',
          reason: 'FailedScheduling',
          involvedObject: { kind: 'Pod', name: 'web' },
          message: 'no nodes available',
          // No lastTimestamp and no count — the shape events.k8s.io/v1 leaves in the core v1 view.
          series: { count: 9, lastObservedTime: new Date('2026-10-06T09:14:22Z') },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('events'));

    expect(list.items[0]).toMatchObject({ count: 9, lastSeen: '2026-10-06T09:14:22.000Z' });
  });

  it('falls back to eventTime when there is no series either', async () => {
    (clients.coreV1.listEventForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'web.18a', namespace: 'default' },
          involvedObject: { kind: 'Pod', name: 'web' },
          eventTime: new Date('2026-10-06T10:00:00Z'),
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('events'));

    expect(list.items[0]).toMatchObject({ lastSeen: '2026-10-06T10:00:00.000Z' });
  });

  it('keeps the newest events when it has to cut, not the ones that sort first by name', async () => {
    // The API server returns items in etcd key order, so without an explicit sort the cut drops
    // whole namespaces — and for events the dropped part is as likely as not to be the answer.
    const events = Array.from({ length: MAX_ITEMS + 2 }, (_, i) => ({
      metadata: { name: `event-${i}`, namespace: 'default' },
      involvedObject: { kind: 'Pod', name: `pod-${i}` },
      // Oldest first, which is the worst case: a plain slice would keep exactly the wrong end.
      lastTimestamp: new Date(2026, 0, 1, 0, 0, i),
    }));
    (clients.coreV1.listEventForAllNamespaces as jest.Mock).mockReturnValue(ok(events));

    const list = await listResources(clients, resolveTarget('events'));

    expect(list.truncated).toBe(true);
    expect(list.items[0]).toMatchObject({ name: `event-${MAX_ITEMS + 1}` });
    expect(list.items.map((item) => item.name)).not.toContain('event-0');
  });

  it('omits the namespace field for a cluster-scoped kind', async () => {
    (clients.coreV1.listNode as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: {
            name: 'node-1',
            labels: { 'node-role.kubernetes.io/master': '', 'metalk8s.scality.com/version': '129.0' },
          },
          status: { conditions: [{ type: 'Ready', status: 'True' }], nodeInfo: { kubeletVersion: 'v1.29.5' } },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('nodes'));

    expect(list.namespace).toBeUndefined();
    expect(list.items[0]).toEqual({
      name: 'node-1',
      status: 'Ready',
      unschedulable: false,
      roles: ['master'],
      kubeletVersion: 'v1.29.5',
      createdAt: undefined,
    });
  });

  it('says a node is cordoned, which it stays Ready while being', async () => {
    (clients.coreV1.listNode as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'node-2', labels: {} },
          spec: { unschedulable: true },
          status: { conditions: [{ type: 'Ready', status: 'True' }] },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('nodes'));

    // Ready and taking no new pods: a common reason for a Pending pod, and invisible in the status.
    expect(list.items[0]).toMatchObject({ status: 'Ready', unschedulable: true });
  });

  it.each([
    [
      'a pod on its way out reads Terminating, not Running',
      { phase: 'Running', containerStatuses: [{ ready: true, restartCount: 0, state: { running: {} } }] },
      'Terminating',
    ],
    // kubectl drops Terminating for these, and so does this: each says more than "Terminating" does.
    ['a lost node keeps NodeLost', { phase: 'Running', reason: 'NodeLost' }, 'NodeLost'],
    ['an evicted pod keeps Evicted', { phase: 'Failed', reason: 'Evicted' }, 'Evicted'],
    ['a finished pod keeps Succeeded', { phase: 'Succeeded' }, 'Succeeded'],
  ])('%s', async (_, status, expected) => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: {
            name: 'web-abc',
            namespace: 'default',
            deletionTimestamp: new Date('2026-10-07T09:00:00Z'),
          },
          spec: { containers: [{ name: 'web' }] },
          status,
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list.items[0]).toMatchObject({ status: expected });
  });

  it('calls an evicted pod evicted, not failed', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'web-abc', namespace: 'default' },
          spec: { containers: [{ name: 'web' }] },
          // An evicted pod has no container statuses left — the reason is on the pod.
          status: { phase: 'Failed', reason: 'Evicted' },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list.items[0]).toMatchObject({ status: 'Evicted' });
  });

  it('returns a ConfigMap key names and never its values', async () => {
    (clients.coreV1.listConfigMapForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'app-config', namespace: 'default' },
          data: { 'database.url': 'postgres://user:hunter2@db:5432/app' },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('configmaps'));

    expect(list.items[0]).toMatchObject({ keys: ['database.url'] });
    expect(JSON.stringify(list)).not.toContain('hunter2');
  });

  it('lists a custom resource through CustomObjectsApi, with group and version as arguments', async () => {
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([{ metadata: { name: 'volume-1' }, status: { phase: 'Available' } }]),
    );

    const list = await listResources(clients, resolveTarget('volumes', 'storage.metalk8s.scality.com/v1alpha1'));

    expect(clients.customObjects.listClusterCustomObject).toHaveBeenCalledWith(
      'storage.metalk8s.scality.com',
      'v1alpha1',
      'volumes',
    );
    expect(list.apiVersion).toBe('storage.metalk8s.scality.com/v1alpha1');
    expect(list.items[0]).toEqual({
      name: 'volume-1',
      namespace: undefined,
      status: 'Available',
      createdAt: undefined,
    });
  });

  it("projects a custom resource's conditions, which is where most CRDs report health", async () => {
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'storage-data-01', namespace: undefined },
          status: {
            conditions: [{ type: 'Ready', status: 'False', reason: 'FormatFailed', extra: 'not projected' }],
          },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('volumes', 'storage.metalk8s.scality.com/v1alpha1'));

    expect(list.items[0]).toMatchObject({
      name: 'storage-data-01',
      conditions: [{ type: 'Ready', status: 'False', reason: 'FormatFailed' }],
    });
  });

  it('asks for cronjobs at batch/v1, the version the API server serves', async () => {
    // The generated client's only CronJob method points at batch/v1beta1, which has been gone since
    // Kubernetes 1.25. Mocking the client hides that, so this asserts the path instead.
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'backup', namespace: 'default', creationTimestamp: '2026-10-02T08:11:04Z' },
          spec: { schedule: '0 2 * * *' },
          status: { active: [] },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('cronjobs'));

    expect(clients.customObjects.listClusterCustomObject).toHaveBeenCalledWith('batch', 'v1', 'cronjobs');
    expect(list.items[0]).toMatchObject({ name: 'backup', schedule: '0 2 * * *', active: 0 });
  });

  it('does not claim a namespace scope it was never told, for a cluster-scoped custom kind', async () => {
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([{ metadata: { name: 'ssd-ext4' } }]),
    );

    const list = await listResources(clients, resolveTarget('storageclasses', 'storage.k8s.io/v1'));

    expect(list.namespace).toBeUndefined();
  });

  it('says "all" for a custom kind once an item shows it is namespaced', async () => {
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([{ metadata: { name: 'artesca-data', namespace: 'zenko' } }]),
    );

    const list = await listResources(clients, resolveTarget('zenkos', 'zenko.io/v1alpha2'));

    expect(list.namespace).toBe('all');
  });

  it.each([
    [401, 'session_expired'],
    [403, 'not_authorized'],
    [404, 'not_found'],
    [500, 'unavailable'],
  ])('maps HTTP %i to %s, keeping them apart', async (statusCode, status) => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockRejectedValue(apiRejection(statusCode));

    await expect(listResources(clients, resolveTarget('pods'))).rejects.toMatchObject({ status });
  });

  it('reads the status off a fetch-shaped rejection too', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockRejectedValue({
      response: { status: 403 },
    });

    await expect(listResources(clients, resolveTarget('pods'))).rejects.toMatchObject({
      status: 'not_authorized',
    });
  });

  it('calls a 200 with no items malformed, not an empty list', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockResolvedValue({
      response: { statusCode: 200 },
      body: { kind: 'Status', message: 'something else entirely' },
    });

    await expect(listResources(clients, resolveTarget('pods'))).rejects.toMatchObject({
      status: 'malformed',
    });
  });

  it('reports an empty cluster as an empty list', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(ok([]));

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list).toMatchObject({ items: [], returned: 0, truncated: false });
  });

  it('cuts an over-long list and says so, with an honest count', async () => {
    const pods = Array.from({ length: MAX_ITEMS + 7 }, (_, i) => ({
      metadata: { name: `pod-${i}`, namespace: 'default' },
      spec: { containers: [] },
      status: { phase: 'Running' },
    }));
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(ok(pods));

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list.items).toHaveLength(MAX_ITEMS);
    expect(list.returned).toBe(MAX_ITEMS);
    expect(list.truncated).toBe(true);
    expect(list.total).toBe(MAX_ITEMS + 7);
  });
});
