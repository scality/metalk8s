import { QueryClient } from 'react-query';
import { k8sApi } from '../../services/k8s/clients';
import { DEFAULT_TAIL_LINES } from '../../services/k8s/logs';
import type { ToolContext } from '../types';
import { createGetPodLogsTool } from './getPodLogsTool';

jest.mock('../../services/k8s/clients', () => ({ k8sApi: jest.fn() }));

const readNamespacedPod = jest.fn();
const text = jest.fn();
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
  createGetPodLogsTool(context).execute(args as { pod: string; namespace: string }) as Promise<Record<string, unknown>>;

beforeEach(() => {
  jest.clearAllMocks();
  (k8sApi as jest.Mock).mockReturnValue({ coreV1: { readNamespacedPod }, text });
  readNamespacedPod.mockReturnValue(ok({ spec: { containers: [{ name: 'web' }] } }));
});

describe('getPodLogs', () => {
  it('is declared read-only', () => {
    expect(createGetPodLogsTool(makeContext()).annotations).toEqual({ readOnlyHint: true });
  });

  it('reads the last lines of the named container', async () => {
    text.mockResolvedValue('2026-10-06T09:14:21.882Z started\n');

    const result = await run({ pod: 'web-abc', namespace: 'default', container: 'web' });

    expect(result.status).toBe('ok');
    expect(result.text).toContain('started');
    expect(result.bounded).toBe('default');
    expect(result.latest).toBe('2026-10-06T09:14:21.882Z');
    expect(k8sApi).toHaveBeenCalledWith('/api/kubernetes', 'a-fresh-token');
    // The pod is not read when the container is named: one call, not two.
    expect(readNamespacedPod).not.toHaveBeenCalled();
  });

  it('asks for a container instead of failing, when the pod has several', async () => {
    readNamespacedPod.mockReturnValue(ok({ spec: { containers: [{ name: 'web' }, { name: 'sidecar' }] } }));

    const result = await run({ pod: 'web-abc', namespace: 'default' });

    expect(result.status).toBe('ok');
    expect(result.containers).toEqual(['web', 'sidecar']);
    expect(text).not.toHaveBeenCalled();
  });

  it.each([
    ['a pattern that does not compile', { pattern: '([unclosed' }],
    ['both ways of saying since', { sinceSeconds: 60, sinceTime: '2026-10-06T09:15:00.000Z' }],
    ['a pod name that is a path', { pod: '../../secrets' }],
  ])('refuses %s before a connection is opened', async (_, params) => {
    const result = await run({ pod: 'web-abc', namespace: 'default', ...params });

    expect(result.status).toBe('malformed');
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('says unavailable when the deployment exposes no Kubernetes API', async () => {
    const result = await run({ pod: 'web-abc', namespace: 'default' }, makeContext({ selfConfiguration: {} }));

    expect(result.status).toBe('unavailable');
  });

  it('says session_expired when there is no token', async () => {
    const result = await run(
      { pod: 'web-abc', namespace: 'default' },
      makeContext({ getToken: jest.fn().mockResolvedValue(null) }),
    );

    expect(result.status).toBe('session_expired');
  });

  it('keeps a log it may not read apart from one that is empty', async () => {
    text.mockRejectedValue({ response: { statusCode: 403 } });

    const result = await run({ pod: 'web-abc', namespace: 'default' });

    expect(result.status).toBe('not_authorized');
    expect(result.message).toMatch(/does NOT mean the resources are absent/i);
    expect(result).not.toHaveProperty('text');
  });

  it('hands the log over as the container wrote it', async () => {
    // Deliberately not redacted, unlike an object's spec: a log is what the container chose to say,
    // and withholding part of it hides the line someone is looking for.
    text.mockResolvedValue('2026-10-06T09:14:21.882Z connecting with password hunter2\n');

    const result = await run({ pod: 'web-abc', namespace: 'default', container: 'web' });

    expect(result.text).toContain('hunter2');
    expect(result).not.toHaveProperty('omitted');
  });

  it('tells a caller what a null latest and an empty search mean', () => {
    const { description, inputSchema } = createGetPodLogsTool(makeContext());

    expect(description).toMatch(/reading forward is unavailable/i);
    expect(description).toMatch(/NOT the same as matching nothing in the log/i);
    expect(description).toContain(`${DEFAULT_TAIL_LINES}`);
    expect(inputSchema.required).toEqual(['pod', 'namespace']);
    // follow streams until the connection closes, and a tool returns once.
    expect(inputSchema.properties).not.toHaveProperty('follow');
  });
});
