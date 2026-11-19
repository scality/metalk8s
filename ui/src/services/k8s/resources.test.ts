import type { K8sApiClients } from './clients';
import { ALLOWED_KINDS, listResources, MAX_ITEMS, resolveTarget } from './resources';

/** What the client rejects with: `{ response, body }`, not an Error subclass. */
const apiRejection = (statusCode: number) => ({ response: { statusCode }, body: {} });

const makeClients = () => ({ json: jest.fn() }) as unknown as K8sApiClients;

/** A meta.k8s.io Table, as the API server prints a list for kubectl. */
const table = (
  columns: string[],
  rows: { cells: unknown[]; object?: Record<string, unknown> }[],
): Record<string, unknown> => ({
  kind: 'Table',
  apiVersion: 'meta.k8s.io/v1',
  columnDefinitions: columns.map((name, index) => ({ name, priority: index > 2 ? 1 : 0 })),
  rows,
});

const inNamespace = (namespace: string, name: string) => ({ metadata: { name, namespace } });

describe('resolveTarget', () => {
  it('refuses an unknown kind with no apiVersion, before anything is sent', () => {
    expect(() => resolveTarget('widgets')).toThrow(expect.objectContaining({ status: 'not_found' }));
  });

  it('maps an allowlisted kind to its own entry and apiVersion', () => {
    const target = resolveTarget('deployments');

    expect(target).toMatchObject({ kind: 'deployments', apiVersion: 'apps/v1' });
    expect(target.entry).toBeDefined();
  });

  it('takes an unknown kind with an apiVersion as it is named, with no entry', () => {
    expect(resolveTarget('volumes', 'storage.metalk8s.scality.com/v1alpha1')).toEqual({
      kind: 'volumes',
      apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
    });
  });

  it('reaches a built-in kind outside the allowlist, not just custom resources', () => {
    // Any API group is reachable, so the escape hatch is not limited to CRDs — and the tool's
    // description says so. This is what makes that true.
    expect(resolveTarget('ingresses', 'networking.k8s.io/v1')).toEqual({
      kind: 'ingresses',
      apiVersion: 'networking.k8s.io/v1',
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
    expect(resolveTarget('Volumes', 'storage.metalk8s.scality.com/v1alpha1').kind).toBe('volumes');
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

  it('offers secrets among the kinds it lists by name', () => {
    expect(ALLOWED_KINDS).toContain('secrets');
    expect(resolveTarget('secrets')).toMatchObject({ kind: 'secrets', apiVersion: 'v1' });
  });
});

describe('listResources', () => {
  let clients: K8sApiClients;
  const answer = (value: unknown) => (clients.json as jest.Mock).mockResolvedValue(value);

  beforeEach(() => {
    clients = makeClients();
  });

  it("asks the API server for the Table kubectl prints, at the kind's own path", async () => {
    answer(table(['Name'], []));

    await listResources(clients, resolveTarget('deployments'));

    expect(clients.json).toHaveBeenCalledWith(
      '/apis/apps/v1/deployments',
      { includeObject: 'Metadata' },
      { accept: expect.stringMatching(/^application\/json;as=Table;v=v1;g=meta\.k8s\.io/) },
    );
  });

  it('answers with every -o wide column, keyed in camelCase, namespace first and <none> left out', async () => {
    answer(
      table(
        ['Name', 'Ready', 'Status', 'Restarts', 'Age', 'IP', 'Node', 'Nominated Node', 'Readiness Gates'],
        [
          {
            cells: [
              'web-7d9f',
              '1/2',
              'CrashLoopBackOff',
              '14 (3m ago)',
              '2d',
              '10.0.0.4',
              'node-1',
              '<none>',
              '<none>',
            ],
            object: inNamespace('default', 'web-7d9f'),
          },
        ],
      ),
    );

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list).toEqual({
      kind: 'pods',
      apiVersion: 'v1',
      namespace: 'all',
      items: [
        {
          namespace: 'default',
          name: 'web-7d9f',
          ready: '1/2',
          status: 'CrashLoopBackOff',
          restarts: '14 (3m ago)',
          age: '2d',
          ip: '10.0.0.4',
          node: 'node-1',
        },
      ],
      returned: 1,
      truncated: false,
    });
    expect(Object.keys(list.items[0]).slice(0, 2)).toEqual(['namespace', 'name']);
  });

  it('has no namespace key for a cluster-scoped kind', async () => {
    answer(table(['Name', 'Status'], [{ cells: ['node-1', 'Ready'], object: { metadata: { name: 'node-1' } } }]));

    const list = await listResources(clients, resolveTarget('nodes'));

    expect(list.namespace).toBeUndefined();
    expect(list.items).toEqual([{ name: 'node-1', status: 'Ready' }]);
  });

  it('keeps no part of the object it was handed beside the row', async () => {
    answer(
      table(
        ['Name', 'Data', 'Age'],
        [
          {
            cells: ['app-config', 1, '5d'],
            object: { metadata: { name: 'app-config', namespace: 'default', uid: 'u' } },
          },
        ],
      ),
    );

    const list = await listResources(clients, resolveTarget('configmaps'));

    // A count of keys, never a value — and a number stays a number.
    expect(list.items).toEqual([{ namespace: 'default', name: 'app-config', data: 1, age: '5d' }]);
    expect(JSON.stringify(list)).not.toContain('uid');
  });

  it('adds the plural and the served apiVersions to a CRD row, ready to send back', async () => {
    answer(
      table(
        ['Name', 'Created At'],
        [
          {
            cells: ['volumes.storage.metalk8s.scality.com', '2026-09-15T16:23:40Z'],
            object: {
              metadata: { name: 'volumes.storage.metalk8s.scality.com' },
              spec: {
                group: 'storage.metalk8s.scality.com',
                names: { plural: 'volumes' },
                versions: [
                  { name: 'v1alpha1', served: true },
                  // Defined but not served: asking for it answers 404, so it is not offered.
                  { name: 'v1alpha2', served: false },
                ],
              },
            },
          },
        ],
      ),
    );

    const list = await listResources(clients, resolveTarget('customresourcedefinitions'));

    // The whole object is needed for those two columns, and only for them.
    expect(clients.json).toHaveBeenCalledWith(expect.any(String), { includeObject: 'Object' }, expect.any(Object));
    expect(list.items[0]).toEqual({
      name: 'volumes.storage.metalk8s.scality.com',
      createdAt: '2026-09-15T16:23:40Z',
      plural: 'volumes',
      apiVersions: 'storage.metalk8s.scality.com/v1alpha1',
    });
    // The discovery loop, end to end: the item's plural and apiVersion resolve as asked.
    expect(resolveTarget(list.items[0].plural as string, list.items[0].apiVersions as string).apiVersion).toBe(
      'storage.metalk8s.scality.com/v1alpha1',
    );
  });

  it('keeps the newest events when it has to cut, not the ones that sort first by name', async () => {
    // The API server returns items in etcd key order, so without an explicit sort the cut drops
    // whole namespaces — and for events the dropped part is as likely as not to be the answer.
    answer(
      table(
        ['Last Seen', 'Reason', 'Object'],
        Array.from({ length: MAX_ITEMS + 2 }, (_, i) => ({
          cells: [`${i}s`, 'BackOff', `pod/pod-${i}`],
          object: {
            metadata: { name: `event-${i}`, namespace: 'default' },
            lastTimestamp: new Date(2026, 0, 1, 0, 0, i),
          },
        })),
      ),
    );

    const list = await listResources(clients, resolveTarget('events'));

    expect(list.truncated).toBe(true);
    expect(list.items[0]).toEqual({
      namespace: 'default',
      lastSeen: `${MAX_ITEMS + 1}s`,
      reason: 'BackOff',
      object: `pod/pod-${MAX_ITEMS + 1}`,
    });
  });

  it('dates an event off series or eventTime when there is no lastTimestamp to sort on', async () => {
    answer(
      table(
        ['Name'],
        [
          { cells: ['old'], object: { metadata: { name: 'old' }, eventTime: new Date('2026-10-06T08:00:00Z') } },
          {
            cells: ['new'],
            object: { metadata: { name: 'new' }, series: { lastObservedTime: new Date('2026-10-06T10:00:00Z') } },
          },
        ],
      ),
    );

    const list = await listResources(clients, resolveTarget('events'));

    expect(list.items.map((item) => item.name)).toEqual(['new', 'old']);
  });

  it('lists a custom resource at its own group and version, with its printer columns', async () => {
    answer(
      table(
        ['Name', 'Node', 'StorageClass'],
        [{ cells: ['volume-1', 'node-1', 'metalk8s'], object: { metadata: { name: 'volume-1' } } }],
      ),
    );

    const list = await listResources(clients, resolveTarget('volumes', 'storage.metalk8s.scality.com/v1alpha1'));

    expect(clients.json).toHaveBeenCalledWith(
      '/apis/storage.metalk8s.scality.com/v1alpha1/volumes',
      { includeObject: 'Metadata' },
      expect.any(Object),
    );
    expect(list).toMatchObject({
      apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
      items: [{ name: 'volume-1', node: 'node-1', storageclass: 'metalk8s' }],
    });
  });

  it('lists a core kind at /api/v1', async () => {
    answer(table(['Name'], []));

    await listResources(clients, resolveTarget('persistentvolumes'));

    expect(clients.json).toHaveBeenCalledWith('/api/v1/persistentvolumes', expect.any(Object), expect.any(Object));
  });

  it('does not claim a namespace scope it was never told, for a cluster-scoped custom kind', async () => {
    answer(table(['Name'], [{ cells: ['ssd-ext4'], object: { metadata: { name: 'ssd-ext4' } } }]));

    const list = await listResources(clients, resolveTarget('storageclasses', 'storage.k8s.io/v1'));

    expect(list.namespace).toBeUndefined();
    expect(list.items).toEqual([{ name: 'ssd-ext4' }]);
  });

  it('says "all" for a custom kind once a row shows it is namespaced', async () => {
    answer(table(['Name'], [{ cells: ['artesca-data'], object: inNamespace('zenko', 'artesca-data') }]));

    const list = await listResources(clients, resolveTarget('zenkos', 'zenko.io/v1alpha2'));

    expect(list.namespace).toBe('all');
    expect(list.items).toEqual([{ namespace: 'zenko', name: 'artesca-data' }]);
  });

  it('falls back to names when the server answers with a plain list instead of a Table', async () => {
    // An aggregated API may not print Tables; a name is all that can honestly be said then.
    answer({ kind: 'PodMetricsList', items: [inNamespace('default', 'web')] });

    const list = await listResources(clients, resolveTarget('pods', 'metrics.k8s.io/v1beta1'));

    expect(list.items).toEqual([{ namespace: 'default', name: 'web' }]);
  });

  it.each([
    [401, 'session_expired'],
    [403, 'not_authorized'],
    [404, 'not_found'],
    [500, 'unavailable'],
  ])('maps HTTP %i to %s, keeping them apart', async (statusCode, status) => {
    (clients.json as jest.Mock).mockRejectedValue(apiRejection(statusCode));

    await expect(listResources(clients, resolveTarget('pods'))).rejects.toMatchObject({ status });
  });

  it('calls a 200 with neither rows nor items malformed, not an empty list', async () => {
    answer({ kind: 'Status', message: 'something else entirely' });

    await expect(listResources(clients, resolveTarget('pods'))).rejects.toMatchObject({ status: 'malformed' });
  });

  it('reports an empty cluster as an empty list', async () => {
    answer(table(['Name'], []));

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list).toMatchObject({ items: [], returned: 0, truncated: false });
  });

  it('cuts an over-long list and says so, with an honest count', async () => {
    answer(
      table(
        ['Name'],
        Array.from({ length: MAX_ITEMS + 7 }, (_, i) => ({
          cells: [`pod-${i}`],
          object: inNamespace('default', `pod-${i}`),
        })),
      ),
    );

    const list = await listResources(clients, resolveTarget('pods'));

    expect(list.items).toHaveLength(MAX_ITEMS);
    expect(list.returned).toBe(MAX_ITEMS);
    expect(list.truncated).toBe(true);
    expect(list.total).toBe(MAX_ITEMS + 7);
  });
});
