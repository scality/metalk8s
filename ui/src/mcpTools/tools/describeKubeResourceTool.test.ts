import { QueryClient } from 'react-query';
import { k8sApi } from '../../services/k8s/clients';
import type { ToolContext } from '../types';
import { createDescribeKubeResourceTool } from './describeKubeResourceTool';

jest.mock('../../services/k8s/clients', () => ({ k8sApi: jest.fn() }));

const ok = (body: unknown) => Promise.resolve({ response: { statusCode: 200 }, body });
const apiRejection = (statusCode: number) => ({ response: { statusCode }, body: {} });

const POD_PATH = '/api/v1/namespaces/default/pods/web-abc';

/** What clients.json answers, by path. A `{ response }` rejects; a path not listed is a 404. */
let routes: Record<string, unknown>;
const json = jest.fn(async (path: string) => {
  if (!(path in routes)) throw apiRejection(404);
  const answer = routes[path];
  if (answer && typeof answer === 'object' && 'response' in answer) throw answer;
  return answer;
});
const listNamespacedEvent = jest.fn();
const listEventForAllNamespaces = jest.fn();

const makeContext = (overrides: Partial<ToolContext> = {}): ToolContext =>
  ({
    getToken: jest.fn().mockResolvedValue('a-fresh-token'),
    userData: undefined,
    selfConfiguration: { url: '/api/kubernetes' },
    queryClient: new QueryClient(),
    ...overrides,
  }) as ToolContext;

const run = (args: Record<string, unknown>, context = makeContext()) =>
  createDescribeKubeResourceTool(context).execute(
    args as { kind: string; apiVersion: string; name: string },
  ) as Promise<Record<string, unknown>>;

const describePod = (extra: Record<string, unknown> = {}) =>
  run({ kind: 'pods', apiVersion: 'v1', name: 'web-abc', namespace: 'default', ...extra });

beforeEach(() => {
  jest.clearAllMocks();
  routes = {
    '/api/v1': {
      resources: [
        { name: 'pods', namespaced: true },
        { name: 'nodes', namespaced: false },
      ],
    },
    '/apis/apps/v1': { resources: [{ name: 'replicasets', namespaced: true }] },
    '/apis/storage.metalk8s.scality.com/v1alpha1': { resources: [{ name: 'volumes', namespaced: false }] },
  };
  (k8sApi as jest.Mock).mockReturnValue({ json, coreV1: { listNamespacedEvent, listEventForAllNamespaces } });
  listNamespacedEvent.mockReturnValue(ok({ items: [] }));
  listEventForAllNamespaces.mockReturnValue(ok({ items: [] }));
});

describe('describeKubeResource', () => {
  it('is declared read-only', () => {
    expect(createDescribeKubeResourceTool(makeContext()).annotations).toEqual({ readOnlyHint: true });
  });

  it('describes the object it was asked for', async () => {
    routes[POD_PATH] = {
      metadata: { name: 'web-abc', namespace: 'default', uid: 'uid-1' },
      spec: { nodeName: 'node-1', containers: [{ name: 'web' }] },
      status: { phase: 'Running', containerStatuses: [{ ready: true, restartCount: 0 }] },
    };

    const result = await describePod();

    expect(result).toMatchObject({ status: 'ok', kind: 'pods', apiVersion: 'v1', name: 'web-abc' });
    expect(result.resource).toMatchObject({ status: { phase: 'Running' } });
    expect(k8sApi).toHaveBeenCalledWith('/api/kubernetes', 'a-fresh-token');
  });

  it.each([
    [
      'a namespaced kind outside the core group',
      'replicasets',
      'apps/v1',
      'default',
      '/apis/apps/v1/namespaces/default/replicasets/web',
    ],
    [
      'a cluster-scoped custom resource',
      'volumes',
      'storage.metalk8s.scality.com/v1alpha1',
      undefined,
      '/apis/storage.metalk8s.scality.com/v1alpha1/volumes/web',
    ],
  ])('describes %s the same way as a pod', async (_, kind, apiVersion, namespace, path) => {
    routes[path] = { metadata: { name: 'web', uid: 'uid-w' } };

    const result = await run({ kind, apiVersion, name: 'web', ...(namespace ? { namespace } : {}) });

    expect(result).toMatchObject({ status: 'ok', kind, apiVersion });
    expect(json).toHaveBeenCalledWith(path);
  });

  it('takes the scope from the API server, and refuses a namespace on a cluster-scoped kind', async () => {
    const result = await run({
      kind: 'volumes',
      apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
      name: 'web',
      namespace: 'default',
    });

    expect(result.status).toBe('malformed');
    expect(result.message).toMatch(/cluster-scoped/);
  });

  it('says a kind the cluster does not serve is not_found, without a list of kinds to pick from', async () => {
    const result = await run({ kind: 'widgets', apiVersion: 'apps/v1', name: 'thing', namespace: 'default' });

    expect(result.status).toBe('not_found');
    expect(result.message).toMatch(/"widgets" is not served at apps\/v1/);
    // Any kind the cluster serves can be described, so a list would suggest a limit that is not there.
    expect(result).not.toHaveProperty('allowedKinds');
  });

  it('describes a Secret as kubectl does: its keys and their sizes, never a value', async () => {
    routes['/api/v1'] = { resources: [{ name: 'secrets', namespaced: true }] };
    routes['/api/v1/namespaces/default/secrets/db'] = {
      metadata: {
        name: 'db',
        namespace: 'default',
        annotations: { 'kubectl.kubernetes.io/last-applied-configuration': '{"data":{"pw":"aHVudGVyMg=="}}' },
      },
      type: 'Opaque',
      // "hunter2" (7 bytes) and "admin" (5 bytes).
      data: { password: 'aHVudGVyMg==', user: 'YWRtaW4=' },
    };

    const result = await run({ kind: 'secrets', apiVersion: 'v1', name: 'db', namespace: 'default' });

    expect(result.status).toBe('ok');
    expect(result.resource).toMatchObject({ type: 'Opaque', data: { password: '7 bytes', user: '5 bytes' } });
    expect(result.omitted).toContain('Secret values (keys and sizes kept)');
    // Neither the value nor its copy in the annotation kubectl apply writes.
    expect(JSON.stringify(result)).not.toContain('aHVudGVyMg==');
    expect(JSON.stringify(result)).not.toContain('YWRtaW4=');
  });

  it.each([
    ['signingkeies', 'dex.coreos.com/v1'],
    ['passwords', 'DEX.CoreOS.com/v1'],
    ['whatever-they-add-next', 'dex.coreos.com/v1'],
  ])("refuses Dex's %s, whose credentials sit in its own fields, before any request", async (kind, apiVersion) => {
    const result = await run({ kind, apiVersion, name: 'key', namespace: 'dex' });

    expect(result.status).toBe('not_authorized');
    expect(result.message).toMatch(/never described/i);
    // Our policy, not the cluster's answer: nothing that blames the user's permissions.
    expect(result.message).not.toMatch(/RBAC/i);
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it.each([
    ['no apiVersion', { kind: 'pods', name: 'web', namespace: 'default' }, 'malformed'],
    ['a kind that is not a string', { kind: 7, apiVersion: 'v1', name: 'web' }, 'malformed'],
    ['an apiVersion that is not one', { kind: 'pods', apiVersion: 'not/an/apiversion', name: 'web' }, 'malformed'],
    ['a name that is not a string', { kind: 'pods', apiVersion: 'v1', name: 7 }, 'malformed'],
    ['a namespace that is not a string', { kind: 'pods', apiVersion: 'v1', name: 'web', namespace: 7 }, 'malformed'],
    [
      'an includeEvents that is not a boolean',
      { kind: 'pods', apiVersion: 'v1', name: 'web', namespace: 'default', includeEvents: 'yes' },
      'malformed',
    ],
  ])('refuses %s rather than throwing out of execute, before any connection', async (_, args, status) => {
    const result = await run(args);

    expect(result.status).toBe(status);
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('says unavailable when the deployment exposes no Kubernetes API', async () => {
    const result = await run(
      { kind: 'pods', apiVersion: 'v1', name: 'web-abc', namespace: 'default' },
      makeContext({ selfConfiguration: {} }),
    );

    expect(result.status).toBe('unavailable');
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('says session_expired when there is no token, rather than calling with none', async () => {
    const result = await run(
      { kind: 'pods', apiVersion: 'v1', name: 'web-abc', namespace: 'default' },
      makeContext({ getToken: jest.fn().mockResolvedValue(null) }),
    );

    expect(result.status).toBe('session_expired');
    expect(k8sApi).not.toHaveBeenCalled();
  });

  it('withholds what disclose() withholds — the wiring, not the function', async () => {
    // disclosure.test.ts proves disclose() drops the value. Nothing proved the tool CALLS it: drop
    // `resource` from the return below, or let `...description` land after it, and the raw object
    // goes to the model with every test still green.
    routes[POD_PATH] = {
      metadata: { name: 'web-abc', namespace: 'default' },
      spec: { containers: [{ name: 'web', env: [{ name: 'PW', value: 'hunter2' }] }] },
      status: { phase: 'Running' },
    };

    const result = await describePod();

    expect(JSON.stringify(result)).not.toContain('hunter2');
    expect(JSON.stringify(result)).toContain('"PW"');
    expect(result.omitted).toContain('env values (names kept)');
  });

  it('keeps an object it may not look at apart from one that is not there', async () => {
    routes[POD_PATH] = apiRejection(403);

    const result = await describePod();

    expect(result.status).toBe('not_authorized');
    expect(result.message).toMatch(/does NOT mean the resources are absent/i);
  });

  it('reports a missing object as not_found', async () => {
    expect((await run({ kind: 'pods', apiVersion: 'v1', name: 'gone', namespace: 'default' })).status).toBe(
      'not_found',
    );
  });

  it('asks for kind, apiVersion and name, and says what a null events list means', () => {
    const { description, inputSchema } = createDescribeKubeResourceTool(makeContext());

    expect(description).toMatch(/null is NOT "no events"/i);
    // The values are gone but the names are not, and a model has to be told the difference.
    expect(description).toMatch(/never report it as empty or missing/i);
    expect(inputSchema.required).toEqual(['kind', 'apiVersion', 'name']);
    expect(inputSchema.properties.kind).not.toHaveProperty('enum');
  });
});

describe('the envelope', () => {
  it("keeps this call's status apart from the object's", async () => {
    routes[POD_PATH] = {
      metadata: { name: 'web-abc', namespace: 'default' },
      spec: {},
      // The object's own status, which must not become the answer's.
      status: { phase: 'Running' },
    };

    const result = await describePod();

    expect(result.status).toBe('ok');
    expect(result.resource).toMatchObject({ status: { phase: 'Running' } });
  });
});
