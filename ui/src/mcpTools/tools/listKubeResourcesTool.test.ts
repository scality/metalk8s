import { QueryClient } from 'react-query';
import { k8sApi } from '../../services/k8s/clients';
import { ALLOWED_KINDS, MAX_ITEMS } from '../../services/k8s/resources';
import type { ToolContext } from '../types';
import { createListKubeResourcesTool } from './listKubeResourcesTool';

jest.mock('../../services/k8s/clients', () => ({ k8sApi: jest.fn() }));

const json = jest.fn();

/** A meta.k8s.io Table of names, one row per [namespace, name] given. */
const table = (rows: [string | undefined, string][], columns = ['Name'], cells = (name: string) => [name]) => ({
  kind: 'Table',
  columnDefinitions: columns.map((name) => ({ name })),
  rows: rows.map(([namespace, name]) => ({ cells: cells(name), object: { metadata: { name, namespace } } })),
});

const makeContext = (overrides: Partial<ToolContext> = {}): ToolContext =>
  ({
    getToken: jest.fn().mockResolvedValue('a-fresh-token'),
    userData: undefined,
    selfConfiguration: { url: '/api/kubernetes' },
    // A real QueryClient: the tool fetches through it, so a fake would test nothing.
    queryClient: new QueryClient(),
    ...overrides,
  }) as ToolContext;

const run = (args: { kind: string; apiVersion?: string }, context = makeContext()) =>
  createListKubeResourcesTool(context).execute(args) as Promise<Record<string, unknown>>;

beforeEach(() => {
  jest.clearAllMocks();
  (k8sApi as jest.Mock).mockReturnValue({ json });
});

describe('listKubeResources', () => {
  it('is declared read-only', () => {
    expect(createListKubeResourcesTool(makeContext()).annotations).toEqual({ readOnlyHint: true });
  });

  it('refuses an unknown kind without reaching the network, and shows what it does know', async () => {
    const result = await run({ kind: 'widgets' });

    expect(result.status).toBe('not_found');
    expect(result.allowedKinds).toContain('pods');
    expect(result.message).toMatch(/apiVersion/);
    expect(k8sApi).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it.each([
    ['on its own', { kind: 'secrets' }],
    ['with a core apiVersion', { kind: 'secrets', apiVersion: 'v1' }],
    ['capitalised', { kind: 'Secrets' }],
  ])('lists secrets %s as kubectl prints them — name, type and key count, never a value', async (_, args) => {
    json.mockResolvedValue({
      kind: 'Table',
      columnDefinitions: [{ name: 'Name' }, { name: 'Type' }, { name: 'Data' }, { name: 'Age' }],
      rows: [
        {
          cells: ['db-credentials', 'Opaque', 2, '3d'],
          // What the API server sends beside a row: metadata only, whose annotations can hold a
          // copy of the data. None of it may reach the answer.
          object: {
            metadata: {
              name: 'db-credentials',
              namespace: 'default',
              annotations: { 'kubectl.kubernetes.io/last-applied-configuration': '{"data":{"pw":"aHVudGVyMg=="}}' },
            },
          },
        },
      ],
    });

    const result = await run(args);

    expect(result).toMatchObject({
      status: 'ok',
      kind: 'secrets',
      apiVersion: 'v1',
      items: [{ namespace: 'default', name: 'db-credentials', type: 'Opaque', data: 2, age: '3d' }],
    });
    // Never the whole object, which is where the values are.
    expect(json).toHaveBeenCalledWith('/api/v1/secrets', { includeObject: 'Metadata' }, expect.any(Object));
    expect(JSON.stringify(result)).not.toContain('aHVudGVyMg==');
    expect(JSON.stringify(result)).not.toContain('last-applied');
  });

  it("lists Dex's resources like any other group's, by the columns kubectl prints", async () => {
    json.mockResolvedValue(table([['dex', 'signing-key']]));

    const result = await run({ kind: 'signingkeies', apiVersion: 'dex.coreos.com/v1' });

    expect(result).toMatchObject({ status: 'ok', items: [{ namespace: 'dex', name: 'signing-key' }] });
  });

  it('still allows other custom resources in other groups', async () => {
    json.mockResolvedValue(table([[undefined, 'volume-1']]));

    expect((await run({ kind: 'volumes', apiVersion: 'storage.metalk8s.scality.com/v1alpha1' })).status).toBe('ok');
  });

  it.each([
    ['a kind that is not a string', { kind: 123 }, 'not_found'],
    ['an apiVersion that is not a string', { kind: 'pods', apiVersion: 1 }, 'malformed'],
  ])('refuses %s rather than throwing out of execute', async (_, args, status) => {
    // Nothing guarantees the host validated the schema. Untyped input used to reach kind.trim(),
    // where it threw, or resolveTarget, where it was reported as an unreachable API.
    const result = await run(args as unknown as { kind: string });

    expect(result.status).toBe(status);
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('refuses a malformed apiVersion without reaching the network', async () => {
    const result = await run({ kind: 'volumes', apiVersion: 'storage.metalk8s.scality.com' });

    expect(result.status).toBe('malformed');
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('says unavailable when the deployment exposes no Kubernetes API', async () => {
    const result = await run({ kind: 'pods' }, makeContext({ selfConfiguration: {} }));

    expect(result.status).toBe('unavailable');
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('says session_expired when there is no token, rather than calling with none', async () => {
    const result = await run({ kind: 'pods' }, makeContext({ getToken: jest.fn().mockResolvedValue(null) }));

    expect(result.status).toBe('session_expired');
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('builds the clients from the configured URL and a freshly fetched token', async () => {
    json.mockResolvedValue(table([]));

    await run({ kind: 'pods' });

    expect(k8sApi).toHaveBeenCalledWith('/api/kubernetes', 'a-fresh-token');
  });

  it('returns the list as kubectl prints it, with no message to restate it', async () => {
    json.mockResolvedValue(
      table([['kube-system', 'coredns-abc']], ['Name', 'Ready', 'Status'], (name) => [name, '1/1', 'Running']),
    );

    const result = await run({ kind: 'pods' });

    expect(result).toEqual({
      status: 'ok',
      kind: 'pods',
      apiVersion: 'v1',
      namespace: 'all',
      items: [{ namespace: 'kube-system', name: 'coredns-abc', ready: '1/1', status: 'Running' }],
      returned: 1,
      truncated: false,
    });
    expect(result).not.toHaveProperty('message');
  });

  it('explains a cut list, which the data cannot show on its own', async () => {
    json.mockResolvedValue(table(Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ['default', `pod-${i}`])));

    const result = await run({ kind: 'pods' });

    expect(result.truncated).toBe(true);
    expect(result.message).toContain(`${MAX_ITEMS}`);
    expect(result.message).toMatch(/no way\s+to ask for the rest/i);
  });

  it('keeps a forbidden list apart from an empty one', async () => {
    json.mockRejectedValue({ response: { statusCode: 403 } });

    const result = await run({ kind: 'pods' });

    expect(result.status).toBe('not_authorized');
    // The wording matters: a caller summarising a 403 as "no pods found" is the failure mode.
    expect(result.message).toMatch(/does NOT mean the resources are absent/i);
    expect(result).not.toHaveProperty('items');
  });

  it('keeps an expired session apart from a forbidden one', async () => {
    json.mockRejectedValue({ response: { statusCode: 401 } });

    expect((await run({ kind: 'pods' })).status).toBe('session_expired');
  });

  it('reaches a custom resource through its group and version', async () => {
    json.mockResolvedValue(table([[undefined, 'volume-1']]));

    const result = await run({
      kind: 'volumes',
      apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
    });

    expect(json).toHaveBeenCalledWith(
      '/apis/storage.metalk8s.scality.com/v1alpha1/volumes',
      expect.any(Object),
      expect.any(Object),
    );
    expect(result.status).toBe('ok');
    expect(result.apiVersion).toBe('storage.metalk8s.scality.com/v1alpha1');
  });

  it('names no kinds in its prompt, and leaves the correction to the refusal', () => {
    const { description, inputSchema } = createListKubeResourcesTool(makeContext());

    // Nothing here constrains the kind. A reader of this knows what a Kubernetes resource is called
    // and what a CRD is; what it cannot know is which of them this cluster serves, and asking is
    // how it finds out — the refusal carries the kinds that need no apiVersion.
    expect(description).not.toContain(ALLOWED_KINDS.join(', '));
    expect(inputSchema.properties.kind).not.toHaveProperty('enum');
    expect(inputSchema.properties.kind.description).not.toContain('pods');
    // The way out of not knowing a custom resource's version stays, because it is a mechanism
    // rather than a constraint.
    expect(description).toMatch(/customresourcedefinitions first/i);
    expect(inputSchema.required).toEqual(['kind']);
  });
});
