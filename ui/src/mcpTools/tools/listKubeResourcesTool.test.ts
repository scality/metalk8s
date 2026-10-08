import { QueryClient } from 'react-query';
import { k8sApi } from '../../services/k8s/api';
import { MAX_ITEMS } from '../../services/k8s/resources';
import type { ToolContext } from '../types';
import { createListKubeResourcesTool } from './listKubeResourcesTool';

jest.mock('../../services/k8s/api', () => ({ k8sApi: jest.fn() }));

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

  it('names every kind it accepts in its description, so a caller can correct itself', () => {
    const { description, inputSchema } = createListKubeResourcesTool(makeContext());

    expect(description).toContain('pods');
    // A caller that knows "networking.k8s.io/v1" has to read the description as permission to use
    // it: naming only custom resources there reads as "built-in kinds are out of reach".
    expect(description).toMatch(/built-in ones outside the list/i);
    expect(description).toContain('networking.k8s.io/v1');
    // The way out of "I do not know this cluster's CRDs": ask it, rather than guess a version.
    expect(description).toMatch(/customresourcedefinitions first/i);
    expect(description).not.toMatch(/secrets are listed/i);
    expect(inputSchema.required).toEqual(['kind']);
  });
});
