import { QueryClient } from 'react-query';
import { k8sApi } from '../../services/k8s/clients';
import { ALLOWED_KINDS, MAX_ITEMS } from '../../services/k8s/resources';
import type { ToolContext } from '../types';
import { createListKubeResourcesTool } from './listKubeResourcesTool';

jest.mock('../../services/k8s/clients', () => ({ k8sApi: jest.fn() }));

const listPodForAllNamespaces = jest.fn();
const listClusterCustomObject = jest.fn();

const ok = (items: unknown[]) => Promise.resolve({ response: { statusCode: 200 }, body: { items } });

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
  (k8sApi as jest.Mock).mockReturnValue({
    coreV1: { listPodForAllNamespaces },
    customObjects: { listClusterCustomObject },
  });
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
    expect(listPodForAllNamespaces).not.toHaveBeenCalled();
  });

  it.each([
    ['on its own', { kind: 'secrets' }],
    ['with a core apiVersion', { kind: 'secrets', apiVersion: 'v1' }],
    ['with a group, which would route around the allowlist', { kind: 'secrets', apiVersion: 'example.com/v1' }],
    ['capitalised and singular', { kind: 'Secret' }],
  ])('refuses secrets %s, before any request is made', async (_, args) => {
    const result = await run(args);

    expect(result.status).toBe('not_authorized');
    expect(result.message).toMatch(/never listed or read/i);
    // And nothing about RBAC in front of it: this is our policy, not the cluster's answer, and
    // saying both leaves the caller to tell the user their permissions are the problem.
    expect(result.message).not.toMatch(/RBAC/i);
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it.each([
    ['signingkeies', 'dex.coreos.com/v1'],
    ['oauth2clients', 'dex.coreos.com/v1'],
    ['passwords', 'dex.coreos.com/v1'],
  ])('refuses %s, which is a Secret under another name', async (kind, apiVersion) => {
    // Dex runs with storage.type kubernetes, so its OIDC signing keys, client secrets, LDAP bind
    // config and password hashes live in this group. Refusing the kind `secrets` guards the core
    // kind and nothing else; the apiVersion route reaches these by name.
    const result = await run({ kind, apiVersion });

    expect(result.status).toBe('not_authorized');
    expect(result.message).toMatch(/never listed or read/i);
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('still allows other custom resources in other groups', async () => {
    listClusterCustomObject.mockReturnValue(ok([{ metadata: { name: 'volume-1' } }]));

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
    listPodForAllNamespaces.mockReturnValue(ok([]));

    await run({ kind: 'pods' });

    expect(k8sApi).toHaveBeenCalledWith('/api/kubernetes', 'a-fresh-token');
  });

  it('returns the list with no message to restate it', async () => {
    listPodForAllNamespaces.mockReturnValue(
      ok([
        {
          metadata: { name: 'coredns-abc', namespace: 'kube-system' },
          spec: { nodeName: 'node-1', containers: [{ name: 'coredns' }] },
          status: { phase: 'Running', containerStatuses: [{ name: 'coredns', ready: true, restartCount: 0 }] },
        },
      ]),
    );

    const result = await run({ kind: 'pods' });

    expect(result).toEqual({
      status: 'ok',
      kind: 'pods',
      namespace: 'all',
      returned: 1,
      truncated: false,
      items: [
        {
          name: 'coredns-abc',
          namespace: 'kube-system',
          spec: { nodeName: 'node-1' },
          status: { phase: 'Running', containerStatuses: [{ name: 'coredns', ready: true, restartCount: 0 }] },
        },
      ],
    });
    expect(result).not.toHaveProperty('message');
  });

  it('explains a cut list, which the data cannot show on its own', async () => {
    listPodForAllNamespaces.mockReturnValue(
      ok(
        Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({
          metadata: { name: `pod-${i}`, namespace: 'default' },
          spec: { containers: [] },
          status: { phase: 'Running' },
        })),
      ),
    );

    const result = await run({ kind: 'pods' });

    expect(result.truncated).toBe(true);
    expect(result.message).toContain(`${MAX_ITEMS}`);
    expect(result.message).toMatch(/no way\s+to ask for the rest/i);
  });

  it('withholds env values from a kind that keeps its whole object', async () => {
    // An allowlisted kind keeps only the spec keys its entry names, so no pod template reaches the
    // caller. A kind reached by apiVersion keeps everything it came with — and a ReplicaSet, a
    // ControllerRevision or an operator's own resource carries one, passwords included.
    listClusterCustomObject.mockReturnValue(
      ok([
        {
          metadata: { name: 'web-rs', namespace: 'default' },
          spec: { template: { spec: { containers: [{ name: 'web', env: [{ name: 'PW', value: 'hunter2' }] }] } } },
        },
      ]),
    );

    const result = await run({ kind: 'replicasets', apiVersion: 'apps/v1' });

    expect(JSON.stringify(result)).not.toContain('hunter2');
    expect(JSON.stringify(result)).toContain('"PW"');
    expect(result.omitted).toEqual(['env values (names kept)']);
  });

  it('says nothing was withheld when nothing was', async () => {
    listPodForAllNamespaces.mockReturnValue(
      ok([{ metadata: { name: 'web', namespace: 'default' }, spec: {}, status: { phase: 'Running' } }]),
    );

    expect(await run({ kind: 'pods' })).not.toHaveProperty('omitted');
  });

  it('keeps a forbidden list apart from an empty one', async () => {
    listPodForAllNamespaces.mockRejectedValue({ response: { statusCode: 403 } });

    const result = await run({ kind: 'pods' });

    expect(result.status).toBe('not_authorized');
    // The wording matters: a caller summarising a 403 as "no pods found" is the failure mode.
    expect(result.message).toMatch(/does NOT mean the resources are absent/i);
    expect(result).not.toHaveProperty('items');
  });

  it('keeps an expired session apart from a forbidden one', async () => {
    listPodForAllNamespaces.mockRejectedValue({ response: { statusCode: 401 } });

    expect((await run({ kind: 'pods' })).status).toBe('session_expired');
  });

  it('reaches a custom resource through its group and version', async () => {
    listClusterCustomObject.mockReturnValue(ok([{ metadata: { name: 'volume-1' } }]));

    const result = await run({
      kind: 'volumes',
      apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
    });

    expect(listClusterCustomObject).toHaveBeenCalledWith('storage.metalk8s.scality.com', 'v1alpha1', 'volumes');
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
