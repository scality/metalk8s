import { QueryClient } from 'react-query';
import { k8sApi } from '../../services/k8s/api';
import type { ToolContext } from '../types';
import { createDescribeKubeResourceTool } from './describeKubeResourceTool';

jest.mock('../../services/k8s/api', () => ({ k8sApi: jest.fn() }));

const readNamespacedPod = jest.fn();
const listNamespacedEvent = jest.fn();

const ok = (body: unknown) => Promise.resolve({ response: { statusCode: 200 }, body });

const makeContext = (overrides: Partial<ToolContext> = {}): ToolContext =>
  ({
    getToken: jest.fn().mockResolvedValue('a-fresh-token'),
    userData: undefined,
    selfConfiguration: { url: '/api/kubernetes' },
    queryClient: new QueryClient(),
    ...overrides,
  }) as ToolContext;

const run = (args: Record<string, unknown>, context = makeContext()) =>
  createDescribeKubeResourceTool(context).execute(args as { kind: string; name: string }) as Promise<
    Record<string, unknown>
  >;

beforeEach(() => {
  jest.clearAllMocks();
  (k8sApi as jest.Mock).mockReturnValue({
    coreV1: { readNamespacedPod, listNamespacedEvent },
  });
  listNamespacedEvent.mockReturnValue(ok({ items: [] }));
});

describe('describeKubeResource', () => {
  it('is declared read-only', () => {
    expect(createDescribeKubeResourceTool(makeContext()).annotations).toEqual({ readOnlyHint: true });
  });

  it('describes the object it was asked for', async () => {
    readNamespacedPod.mockReturnValue(
      ok({
        metadata: { name: 'web-abc', namespace: 'default', uid: 'uid-1' },
        spec: { nodeName: 'node-1', containers: [{ name: 'web' }] },
        status: { phase: 'Running', containerStatuses: [{ ready: true, restartCount: 0 }] },
      }),
    );

    const result = await run({ kind: 'pods', name: 'web-abc', namespace: 'default' });

    expect(result.status).toBe('ok');
    expect(result.name).toBe('web-abc');
    expect(result.summary).toMatchObject({ status: { phase: 'Running' } });
    expect(k8sApi).toHaveBeenCalledWith('/api/kubernetes', 'a-fresh-token');
  });

  it.each([
    ['on its own', { kind: 'secrets', name: 'db' }],
    ['capitalised and singular', { kind: 'Secret', name: 'db' }],
  ])('refuses secrets %s, before any request is made', async (_, args) => {
    const result = await run(args);

    expect(result.status).toBe('not_authorized');
    expect(result.message).toMatch(/never listed or read/i);
    expect(result.message).not.toMatch(/RBAC/i);
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('refuses an unknown kind without reaching the network, and shows what it does know', async () => {
    const result = await run({ kind: 'widgets', name: 'thing' });

    expect(result.status).toBe('not_found');
    expect(result.allowedKinds).toContain('pods');
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it.each([
    ['a kind that is not a string', { kind: 7, name: 'web' }, 'not_found'],
    ['a name that is not a string', { kind: 'pods', name: 7 }, 'malformed'],
    ['a namespace that is not a string', { kind: 'pods', name: 'web', namespace: 7 }, 'malformed'],
    ['an includeEvents that is not a boolean', { kind: 'pods', name: 'web', includeEvents: 'yes' }, 'malformed'],
  ])('refuses %s rather than throwing out of execute', async (_, args, status) => {
    const result = await run(args);

    expect(result.status).toBe(status);
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('says unavailable when the deployment exposes no Kubernetes API', async () => {
    const result = await run(
      { kind: 'pods', name: 'web-abc', namespace: 'default' },
      makeContext({ selfConfiguration: {} }),
    );

    expect(result.status).toBe('unavailable');
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('says session_expired when there is no token, rather than calling with none', async () => {
    const result = await run(
      { kind: 'pods', name: 'web-abc', namespace: 'default' },
      makeContext({ getToken: jest.fn().mockResolvedValue(null) }),
    );

    expect(result.status).toBe('session_expired');
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('keeps an object it may not look at apart from one that is not there', async () => {
    readNamespacedPod.mockRejectedValue({ response: { statusCode: 403 } });

    const result = await run({ kind: 'pods', name: 'web-abc', namespace: 'default' });

    expect(result.status).toBe('not_authorized');
    expect(result.message).toMatch(/does NOT mean the resources are absent/i);
  });

  it('reports a missing object as not_found', async () => {
    readNamespacedPod.mockRejectedValue({ response: { statusCode: 404 } });

    expect((await run({ kind: 'pods', name: 'gone', namespace: 'default' })).status).toBe('not_found');
  });

  it('tells the caller that a null events list is not an empty one', () => {
    const { description, inputSchema } = createDescribeKubeResourceTool(makeContext());

    expect(description).toMatch(/null is NOT "no events"/i);
    // The values are gone but the names are not, and a model has to be told the difference.
    expect(description).toMatch(/never report it as empty or missing/i);
    expect(inputSchema.required).toEqual(['kind', 'name']);
  });
});

describe('the envelope', () => {
  it("keeps this call's status apart from the object's", async () => {
    readNamespacedPod.mockReturnValue(
      ok({
        metadata: { name: 'web-abc', namespace: 'default' },
        spec: {},
        // The object's own status, which must not become the answer's.
        status: { phase: 'Running' },
      }),
    );

    const result = await run({ kind: 'pods', name: 'web-abc', namespace: 'default' });

    expect(result.status).toBe('ok');
    expect(result.resource).toMatchObject({ status: { phase: 'Running' } });
  });
});
