import type { K8sApiClients } from './clients';
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

  it.each([
    ['persistentvolumeclaims', 'persistentvolumeclaims'],
    ['pvc', 'persistentvolumeclaims'],
    ['persistentvolumes', 'persistentvolumes'],
    ['pv', 'persistentvolumes'],
  ])('takes %s and resolves it to %s', (asked, resolved) => {
    // The API's own plural is the key, because that is what kind means everywhere else. kubectl's
    // short name resolves to it rather than being a dead end a caller has to back out of.
    expect(resolveTarget(asked).kind).toBe(resolved);
  });

  it.each([['crd'], ['crds']])('takes %s for customresourcedefinitions', (asked) => {
    expect(resolveTarget(asked).kind).toBe('customresourcedefinitions');
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

  it('gives a pod its state as Kubernetes reports it, not as a sentence', async () => {
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
            conditions: [{ type: 'Ready', status: 'False', reason: 'ContainersNotReady' }],
            containerStatuses: [
              {
                name: 'operator',
                ready: false,
                restartCount: 47,
                state: { waiting: { reason: 'CrashLoopBackOff' } },
                lastState: { terminated: { exitCode: 1, reason: 'Error' } },
                image: 'registry/operator:1.2.3',
                imageID: 'registry/operator@sha256:0123456789abcdef',
                containerID: 'containerd://fedcba9876543210',
              },
            ],
          },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list.items[0]).toEqual({
      name: 'storage-operator-7d9f',
      namespace: 'metalk8s-system',
      createdAt: '2026-10-02T08:11:04.000Z',
      spec: { nodeName: 'node-2' },
      status: {
        phase: 'Running',
        conditions: [{ type: 'Ready', status: 'False', reason: 'ContainersNotReady' }],
        containerStatuses: [
          {
            name: 'operator',
            ready: false,
            restartCount: 47,
            state: { waiting: { reason: 'CrashLoopBackOff' } },
            lastState: { terminated: { exitCode: 1, reason: 'Error' } },
            image: 'registry/operator:1.2.3',
          },
        ],
      },
    });
  });

  it('derives nothing a reader can see for itself', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'web', namespace: 'default' },
          spec: { nodeName: 'node-1', containers: [{ name: 'web' }] },
          status: { phase: 'Running', containerStatuses: [{ name: 'web', ready: true, restartCount: 0 }] },
        },
      ]),
    );

    const row = (await listResources(clients, resolveTarget('pods'))).items[0];

    // No computed words: CrashLoopBackOff, how many containers are ready and a restart total are all
    // readable from the state above, and computing them here would be a place to be wrong about a
    // cluster newer than the client.
    expect(row).not.toHaveProperty('ready');
    expect(row).not.toHaveProperty('restarts');
    expect(row).not.toHaveProperty('node');
  });

  it('drops managed fields, image digests and container ids, which are bulk', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'web', namespace: 'default', managedFields: [{ manager: 'kubelet' }] },
          spec: { containers: [] },
          status: {
            phase: 'Running',
            containerStatuses: [{ name: 'web', imageID: 'registry/web@sha256:dead', containerID: 'containerd://beef' }],
          },
        },
      ]),
    );

    const row = (await listResources(clients, resolveTarget('pods'))).items[0];

    expect(JSON.stringify(row)).not.toContain('sha256');
    expect(JSON.stringify(row)).not.toContain('containerd://');
    expect(JSON.stringify(row)).not.toContain('managedFields');
  });

  it('keeps what an init container is doing, sidecars included', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'web', namespace: 'default' },
          spec: { containers: [{ name: 'web' }] },
          status: {
            phase: 'Pending',
            initContainerStatuses: [
              { name: 'sidecar', restartCount: 88, state: { running: {} } },
              { name: 'migrate', restartCount: 6, state: { waiting: { reason: 'CrashLoopBackOff' } } },
            ],
            containerStatuses: [{ name: 'web', ready: false, state: { waiting: { reason: 'PodInitializing' } } }],
          },
        },
      ]),
    );

    const row = (await listResources(clients, resolveTarget('pods'))).items[0];

    // Both of them, in order: which one is holding the pod up is a question the reader answers.
    expect((row.status as { initContainerStatuses: unknown[] }).initContainerStatuses).toHaveLength(2);
  });

  it('says when an object is on its way out', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: {
            name: 'web',
            namespace: 'default',
            deletionTimestamp: new Date('2026-10-07T09:00:00Z'),
          },
          spec: { containers: [] },
          status: { phase: 'Running' },
        },
      ]),
    );

    const row = (await listResources(clients, resolveTarget('pods'))).items[0];

    // A pod being deleted goes on reporting Running until it goes; this is the field that says so.
    expect(row.deletionTimestamp).toBe('2026-10-07T09:00:00.000Z');
  });

  it('gives an evicted pod the reason, which is on the pod and not on a container', async () => {
    (clients.coreV1.listPodForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'web', namespace: 'default' },
          spec: { containers: [] },
          status: { phase: 'Failed', reason: 'Evicted' },
        },
      ]),
    );

    const row = (await listResources(clients, resolveTarget('pods'))).items[0];

    expect(row.status).toEqual({ phase: 'Failed', reason: 'Evicted' });
  });

  it('keeps every field that dates an event, whichever API wrote it', async () => {
    (clients.coreV1.listEventForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'web.17f', namespace: 'default' },
          type: 'Warning',
          reason: 'FailedScheduling',
          involvedObject: { kind: 'Pod', name: 'web' },
          message: 'no nodes available',
          // An events.k8s.io/v1 writer leaves neither count nor lastTimestamp in this view.
          series: { count: 9, lastObservedTime: new Date('2026-10-06T09:14:22Z') },
        },
      ]),
    );

    const row = (await listResources(clients, resolveTarget('events'))).items[0];

    expect(row).toMatchObject({
      type: 'Warning',
      reason: 'FailedScheduling',
      series: { count: 9 },
    });
  });

  it('keeps the newest events when it has to cut, not the ones that sort first by name', async () => {
    // The API server returns items in etcd key order, so without an explicit sort the cut drops
    // whole namespaces — and for events the dropped part is as likely as not to be the answer.
    // This is the one piece of derivation left, because a caller cannot reorder what it never got.
    const events = Array.from({ length: MAX_ITEMS + 2 }, (_, i) => ({
      metadata: { name: `event-${i}`, namespace: 'default' },
      involvedObject: { kind: 'Pod', name: `pod-${i}` },
      lastTimestamp: new Date(2026, 0, 1, 0, 0, i),
    }));
    (clients.coreV1.listEventForAllNamespaces as jest.Mock).mockReturnValue(ok(events));

    const list = await listResources(clients, resolveTarget('events'));

    expect(list.truncated).toBe(true);
    expect(list.items[0]).toMatchObject({ involvedObject: { name: `pod-${MAX_ITEMS + 1}` } });
  });

  it('dates an event off series or eventTime when there is no lastTimestamp to sort on', async () => {
    (clients.coreV1.listEventForAllNamespaces as jest.Mock).mockReturnValue(
      ok([
        { metadata: { name: 'old' }, eventTime: new Date('2026-10-06T08:00:00Z') },
        { metadata: { name: 'new' }, series: { lastObservedTime: new Date('2026-10-06T10:00:00Z') } },
      ]),
    );

    const list = await listResources(clients, resolveTarget('events'));

    expect(list.items.map((item) => item.name)).toEqual(['new', 'old']);
  });

  it('omits the namespace field for a cluster-scoped kind', async () => {
    (clients.coreV1.listNode as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: {
            name: 'node-1',
            labels: { 'node-role.kubernetes.io/master': '', 'metalk8s.scality.com/version': '129.0' },
          },
          spec: { unschedulable: true, taints: [{ key: 'node-role.kubernetes.io/master', effect: 'NoSchedule' }] },
          status: { conditions: [{ type: 'Ready', status: 'True' }], nodeInfo: { kubeletVersion: 'v1.34.7' } },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('nodes'));

    expect(list.namespace).toBeUndefined();
    expect(list.items[0]).toEqual({
      name: 'node-1',
      // Roles are labels, and a cordon is a spec field. Both are read, neither is interpreted.
      labels: { 'node-role.kubernetes.io/master': '', 'metalk8s.scality.com/version': '129.0' },
      spec: { unschedulable: true, taints: [{ key: 'node-role.kubernetes.io/master', effect: 'NoSchedule' }] },
      status: { conditions: [{ type: 'Ready', status: 'True' }], nodeInfo: { kubeletVersion: 'v1.34.7' } },
    });
  });

  it('gives a job both its completions and its parallelism', async () => {
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'import', namespace: 'default' },
          // A work-queue job sets only parallelism: there is no total to count towards, and that
          // difference is what a reader needs rather than a denominator invented here.
          spec: { parallelism: 5 },
          status: { succeeded: 3, active: 2 },
        },
      ]),
    );

    const row = (await listResources(clients, resolveTarget('jobs'))).items[0];

    expect(row).toMatchObject({ spec: { parallelism: 5 }, status: { succeeded: 3, active: 2 } });
    expect(row.spec).not.toHaveProperty('completions');
  });

  it.each([
    ['jobs', 'batch', 'v1'],
    ['deployments', 'apps', 'v1'],
    ['statefulsets', 'apps', 'v1'],
    ['daemonsets', 'apps', 'v1'],
  ])('lists %s through CustomObjectsApi, which does not run the response through v1.13 models', async (kind, group, version) => {
    // The generated methods rebuild the object from the attributes their v1.13 models declare, so
    // anything Kubernetes added since is discarded on the way in — a Job's `suspend`, for one.
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([{ metadata: { name: 'x', namespace: 'default' }, spec: { suspend: true }, status: {} }]),
    );

    const list = await listResources(clients, resolveTarget(kind));

    expect(clients.customObjects.listClusterCustomObject).toHaveBeenCalledWith(group, version, kind);
    expect(list.items[0]).toMatchObject({ name: 'x' });
  });

  it('keeps a suspended job distinguishable from a stuck one', async () => {
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([{ metadata: { name: 'paused', namespace: 'default' }, spec: { suspend: true }, status: {} }]),
    );

    const row = (await listResources(clients, resolveTarget('jobs'))).items[0];

    // Without it a suspended job reads as one that has simply never run: no active, no succeeded.
    expect(row.spec).toEqual({ suspend: true });
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

    expect(list.items[0]).toMatchObject({ name: 'app-config', keys: ['database.url'] });
    expect(JSON.stringify(list)).not.toContain('hunter2');
  });

  it('lists the CRDs with the apiVersion to ask each one for, ready to send back', async () => {
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'volumes.storage.metalk8s.scality.com' },
          spec: {
            group: 'storage.metalk8s.scality.com',
            scope: 'Cluster',
            names: { plural: 'volumes' },
            versions: [
              { name: 'v1alpha1', served: true },
              // Defined but not served: asking for it answers 404, so it is not offered.
              { name: 'v1alpha2', served: false },
            ],
          },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('customresourcedefinitions'));

    expect(clients.customObjects.listClusterCustomObject).toHaveBeenCalledWith(
      'apiextensions.k8s.io',
      'v1',
      'customresourcedefinitions',
    );
    expect(list.items[0]).toEqual({
      name: 'volumes.storage.metalk8s.scality.com',
      plural: 'volumes',
      scope: 'Cluster',
      // The exact strings a caller sends back as kind + apiVersion. Nothing to assemble.
      apiVersions: ['storage.metalk8s.scality.com/v1alpha1'],
    });
  });

  it('advertises CRDs in exactly the words it accepts back', async () => {
    // The discovery loop, end to end: ask what the cluster defines, then ask for one of them. If the
    // row's plural and apiVersion did not resolve, a caller would have to guess at a version.
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'volumes.storage.metalk8s.scality.com' },
          spec: {
            group: 'storage.metalk8s.scality.com',
            scope: 'Cluster',
            names: { plural: 'volumes' },
            versions: [{ name: 'v1alpha1', served: true }],
          },
        },
      ]),
    );

    const discovered = (await listResources(clients, resolveTarget('customresourcedefinitions'))).items[0];
    const target = resolveTarget(discovered.plural as string, (discovered.apiVersions as string[])[0]);

    expect(target.custom).toEqual({
      group: 'storage.metalk8s.scality.com',
      version: 'v1alpha1',
      plural: 'volumes',
    });
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
    // No entry means no list of keys to apply, so a custom resource keeps everything it came with.
    expect(list.items[0]).toEqual({ name: 'volume-1', status: { phase: 'Available' } });
  });

  it('keeps everything a kind reached by apiVersion came with, not just a status', async () => {
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([
        {
          apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
          kind: 'Volume',
          metadata: { name: 'storage-data-01' },
          // What this kind is actually about. Guessing at spec/status would have dropped it.
          spec: { nodeName: 'node-1', storageClassName: 'ssd-ext4', sparseLoopDevice: { size: '10Gi' } },
          status: { conditions: [{ type: 'Ready', status: 'True' }] },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('volumes', 'storage.metalk8s.scality.com/v1alpha1'));

    expect(list.items[0]).toEqual({
      name: 'storage-data-01',
      spec: { nodeName: 'node-1', storageClassName: 'ssd-ext4', sparseLoopDevice: { size: '10Gi' } },
      status: { conditions: [{ type: 'Ready', status: 'True' }] },
    });
  });

  it('keeps top-level fields for a kind that has no spec at all', async () => {
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([
        {
          apiVersion: 'storage.k8s.io/v1',
          kind: 'StorageClass',
          metadata: { name: 'ssd-ext4' },
          // A StorageClass keeps these at the top level; a row of spec and status would be empty.
          provisioner: 'rancher.io/local-path',
          reclaimPolicy: 'Delete',
          volumeBindingMode: 'WaitForFirstConsumer',
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('storageclasses', 'storage.k8s.io/v1'));

    expect(list.items[0]).toEqual({
      name: 'ssd-ext4',
      provisioner: 'rancher.io/local-path',
      reclaimPolicy: 'Delete',
      volumeBindingMode: 'WaitForFirstConsumer',
    });
  });

  it("keeps a custom resource's conditions, which is where most CRDs report health", async () => {
    (clients.customObjects.listClusterCustomObject as jest.Mock).mockReturnValue(
      ok([
        {
          metadata: { name: 'storage-data-01' },
          status: { conditions: [{ type: 'Ready', status: 'False', reason: 'FormatFailed' }] },
        },
      ]),
    );

    const list = await listResources(clients, resolveTarget('volumes', 'storage.metalk8s.scality.com/v1alpha1'));

    expect(list.items[0]).toMatchObject({
      name: 'storage-data-01',
      status: { conditions: [{ type: 'Ready', status: 'False', reason: 'FormatFailed' }] },
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
    expect(list.items[0]).toMatchObject({ name: 'backup', spec: { schedule: '0 2 * * *' } });
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
