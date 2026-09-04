import type { ToolAnnotations, ToolDescriptor } from '@mcp-b/webmcp-types';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { QueryClient } from 'react-query';
import { QueryClientProvider } from '../QueryClientProvider';
import type { FederatedModuleInfo } from '../initFederation/ConfigurationProviders';
import { _InternalMCPRegistrar } from './MCPRegistrar';
import {
  _resetHostTasks,
  type TaskStatusReport,
  useHostGetTaskStatusTool,
} from './tasks';
import type { ToolContext } from './types';

const renderWithQueryClient = (ui: ReactElement) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

// ─── Auth mock ────────────────────────────────────────────────────────────────

const mockGetToken = jest.fn().mockResolvedValue('test-token');
const mockUserData = {
  token: 'test-token',
  username: 'testuser',
  groups: ['PlatformAdmin'],
  email: 'test@test.invalid',
  id: 'user-id-1',
};

jest.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
    userData: mockUserData,
  }),
}));

// ─── navigator.modelContext mock ──────────────────────────────────────────────

type RegisteredTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: ToolAnnotations;
  execute: (params: unknown, client: unknown) => Promise<unknown>;
};

const registeredTools: Record<string, RegisteredTool> = {};

// Mirror the WebMCP v3 runtime semantics: registerTool throws on a duplicate name
// (https://github.com/WebMCP-org/npm-packages/issues/231) and an aborted
// options.signal unregisters the tool (the spec-blessed cleanup path that
// replaced the now-removed unregisterTool).
type RegisterToolOptions = { signal?: AbortSignal };

const mockModelContext = {
  registerTool: jest.fn((tool: RegisteredTool, options?: RegisterToolOptions) => {
    if (registeredTools[tool.name]) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    registeredTools[tool.name] = tool;
    options?.signal?.addEventListener('abort', () => {
      delete registeredTools[tool.name];
    });
  }),
  unregisterTool: jest.fn((name: string) => {
    delete registeredTools[name];
  }),
  listTools: jest.fn(() =>
    Object.values(registeredTools).map(({ name, description, inputSchema, annotations }) => ({
      name,
      description,
      inputSchema,
      ...(annotations && { annotations }),
    })),
  ),
};

beforeEach(() => {
  Object.keys(registeredTools).forEach((k) => delete registeredTools[k]);
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue('test-token');
  // Chrome 150+ exposes modelContext on document; navigator is a deprecated alias.
  // Default tests onto document; feature-detection tests override per case.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any).modelContext = mockModelContext;
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (document as any).modelContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (navigator as any).modelContext;
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MODULE_KEY = './MCPTools';
const mcpToolsModuleInfo: FederatedModuleInfo = { module: MODULE_KEY, scope: 'testApp' };
const mockNavigate = jest.fn();
const selfConfiguration = { apiEndpoint: 'http://api.test.local' };

function makeTool(overrides?: Partial<ToolDescriptor>): ToolDescriptor {
  return {
    name: 'testTool',
    description: 'A test tool',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: jest.fn().mockResolvedValue({ result: 'ok' }),
    ...overrides,
  };
}

type TaskToolDescriptor = ToolDescriptor & {
  getTaskStatus?: () => Promise<TaskStatusReport>;
};

const CREATED_AT = '2026-01-01T00:00:00.000Z';

function makeReport(overrides?: Partial<TaskStatusReport>): TaskStatusReport {
  return {
    status: 'working',
    createdAt: CREATED_AT,
    lastUpdatedAt: CREATED_AT,
    ttlMs: 60_000,
    ...overrides,
  };
}

// A tool that kicks off a background op: execute() hands back a { taskId } and the
// descriptor exposes the arg-less getTaskStatus() the host tool routes polls to.
function makeTaskTool(
  name: string,
  taskId: string,
  getTaskStatus?: () => Promise<TaskStatusReport>,
): TaskToolDescriptor {
  return {
    ...makeTool({
      name,
      execute: jest.fn().mockResolvedValue({ taskId, createdAt: CREATED_AT }),
    }),
    ...(getTaskStatus && { getTaskStatus }),
  };
}

// Mounts the host `getTaskStatus` tool the way MCPRegistrar does.
const HostGetTaskStatusTool = () => {
  useHostGetTaskStatusTool();
  return null;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('_InternalMCPRegistrar', () => {
  describe('createTools factory pattern', () => {
    it('registers tools and they appear in navigator.modelContext.listTools()', () => {
      const tool = makeTool();
      const moduleExports = {
        [MODULE_KEY]: { createTools: () => [tool] },
      };

      renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={moduleExports}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      const listed = mockModelContext.listTools();
      expect(listed).toHaveLength(1);
      expect(listed[0].name).toBe('testTool');
      expect(listed[0].description).toBe('A test tool');
    });

    it('passes ToolContext and navigate to createTools', () => {
      let capturedContext: ToolContext | undefined;
      let capturedNavigate: ((path: string) => void) | undefined;

      const moduleExports = {
        [MODULE_KEY]: {
          createTools: (ctx: ToolContext, nav: (path: string) => void) => {
            capturedContext = ctx;
            capturedNavigate = nav;
            return [makeTool()];
          },
        },
      };

      renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={moduleExports}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      expect(capturedContext?.selfConfiguration).toEqual(selfConfiguration);
      expect(capturedNavigate).toBe(mockNavigate);
      expect(capturedContext?.queryClient).toBeDefined();
    });

    it('context.getToken always returns the latest token via ref', async () => {
      let capturedContext: ToolContext | undefined;

      const moduleExports = {
        [MODULE_KEY]: {
          createTools: (ctx: ToolContext) => {
            capturedContext = ctx;
            return [makeTool()];
          },
        },
      };

      renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={moduleExports}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      // Initial call
      await expect(capturedContext!.getToken()).resolves.toBe('test-token');

      // Simulate token refresh — the ref must pick up the new implementation
      mockGetToken.mockResolvedValueOnce('refreshed-token');
      await expect(capturedContext!.getToken()).resolves.toBe('refreshed-token');
    });

    it('forwards annotations including readOnlyHint to registerTool', () => {
      const tool = makeTool({
        annotations: { readOnlyHint: true, openWorldHint: true },
      });
      const moduleExports = {
        [MODULE_KEY]: { createTools: () => [tool] },
      };

      renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={moduleExports}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      expect(mockModelContext.registerTool).toHaveBeenCalledWith(
        expect.objectContaining({
          annotations: { readOnlyHint: true, openWorldHint: true },
        }),
        expect.anything(),
      );
      const listed = mockModelContext.listTools();
      expect(listed[0].annotations).toEqual({ readOnlyHint: true, openWorldHint: true });
    });

    it('registers multiple tools', () => {
      const tool1 = makeTool({ name: 'tool1' });
      const tool2 = makeTool({ name: 'tool2' });
      const moduleExports = {
        [MODULE_KEY]: { createTools: () => [tool1, tool2] },
      };

      renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={moduleExports}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      const listed = mockModelContext.listTools();
      expect(listed.map((t) => t.name)).toEqual(['tool1', 'tool2']);
    });
  });

  describe('legacy static tools array', () => {
    it('registers tools from the static tools array', () => {
      const tool = makeTool({ name: 'legacyTool', description: 'Legacy tool' });
      const moduleExports = {
        [MODULE_KEY]: { tools: [tool] },
      };

      renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={moduleExports}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      const listed = mockModelContext.listTools();
      expect(listed).toHaveLength(1);
      expect(listed[0].name).toBe('legacyTool');
    });

    it('injects context into legacy tool execute calls', async () => {
      const executeFn = jest.fn().mockResolvedValue({ ok: true });
      const moduleExports = {
        [MODULE_KEY]: {
          tools: [makeTool({ name: 'legacyTool', execute: executeFn })],
        },
      };

      renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={moduleExports}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      // Simulate the WebMCP runtime invoking the registered tool
      const registered = registeredTools['legacyTool'];
      await registered.execute({ bucket: 'my-bucket' }, {});

      expect(executeFn).toHaveBeenCalledWith(
        expect.objectContaining({
          bucket: 'my-bucket',
          context: expect.objectContaining({ selfConfiguration }),
        }),
        {},
      );
    });
  });

  describe('cleanup', () => {
    it('registers each tool with an AbortSignal and unregisters all on unmount', () => {
      const moduleExports = {
        [MODULE_KEY]: {
          createTools: () => [makeTool({ name: 'tool1' }), makeTool({ name: 'tool2' })],
        },
      };

      const { unmount } = renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={moduleExports}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      expect(mockModelContext.listTools()).toHaveLength(2);
      // Cleanup must go through the spec-blessed AbortSignal path, not the
      // removed unregisterTool API.
      expect(mockModelContext.registerTool).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(mockModelContext.unregisterTool).not.toHaveBeenCalled();

      unmount();

      expect(mockModelContext.listTools()).toHaveLength(0);
    });
  });

  describe('duplicate registration guard', () => {
    it('does not re-register a tool whose name is already registered', () => {
      // Simulate the name already being present (another app, a StrictMode/HMR
      // remount, etc.). Re-registering would throw in WebMCP — see #231.
      registeredTools['testTool'] = makeTool() as unknown as RegisteredTool;
      const moduleExports = {
        [MODULE_KEY]: { createTools: () => [makeTool()] },
      };

      expect(() =>
        renderWithQueryClient(
          <_InternalMCPRegistrar
            moduleExports={moduleExports}
            mcpToolsModuleInfo={mcpToolsModuleInfo}
            selfConfiguration={selfConfiguration}
            navigate={mockNavigate}
          />,
        ),
      ).not.toThrow();

      expect(mockModelContext.registerTool).not.toHaveBeenCalled();
      expect(mockModelContext.listTools()).toHaveLength(1);
    });

    it('registers only the not-yet-registered tools from a mixed list', () => {
      registeredTools['existing'] = makeTool({ name: 'existing' }) as unknown as RegisteredTool;
      const moduleExports = {
        [MODULE_KEY]: {
          createTools: () => [makeTool({ name: 'existing' }), makeTool({ name: 'fresh' })],
        },
      };

      renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={moduleExports}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      expect(mockModelContext.registerTool).toHaveBeenCalledTimes(1);
      expect(mockModelContext.registerTool).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'fresh' }),
        expect.anything(),
      );
      expect(mockModelContext.listTools().map((t) => t.name).sort()).toEqual([
        'existing',
        'fresh',
      ]);
    });
  });

  describe('modelContext feature detection (Chrome 150 document-first API)', () => {
    it('registers via document.modelContext when present', () => {
      const moduleExports = {
        [MODULE_KEY]: { createTools: () => [makeTool()] },
      };

      renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={moduleExports}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      expect(mockModelContext.registerTool).toHaveBeenCalled();
      expect(mockModelContext.listTools()).toHaveLength(1);
    });

    it('falls back to navigator.modelContext when document.modelContext is absent', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (document as any).modelContext;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).modelContext = mockModelContext;

      const moduleExports = {
        [MODULE_KEY]: { createTools: () => [makeTool()] },
      };

      renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={moduleExports}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      expect(mockModelContext.registerTool).toHaveBeenCalled();
      expect(mockModelContext.listTools()).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('does nothing when modelContext is unavailable on document and navigator', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (document as any).modelContext;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (navigator as any).modelContext;

      const moduleExports = {
        [MODULE_KEY]: { createTools: () => [makeTool()] },
      };

      expect(() =>
        renderWithQueryClient(
          <_InternalMCPRegistrar
            moduleExports={moduleExports}
            mcpToolsModuleInfo={mcpToolsModuleInfo}
            selfConfiguration={selfConfiguration}
            navigate={mockNavigate}
          />,
        ),
      ).not.toThrow();

      expect(mockModelContext.registerTool).not.toHaveBeenCalled();
    });

    it('registers no tools when module export is missing', () => {
      // moduleExports doesn't have the expected module key
      renderWithQueryClient(
        <_InternalMCPRegistrar
          moduleExports={{}}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />,
      );

      expect(mockModelContext.listTools()).toHaveLength(0);
    });
  });
});

describe('background tasks (host getTaskStatus aggregator)', () => {
  // hostTasks is module-level (shared across every app's registrar), so leftovers
  // from a previous case would leak into the next one.
  beforeEach(() => _resetHostTasks());
  afterEach(() => jest.useRealTimers());

  // Mount the app registrar (which wraps each tool's execute) alongside the single
  // host tool, exactly as the real MCPRegistrar tree does.
  const mountWithTasks = (tools: TaskToolDescriptor[]) =>
    renderWithQueryClient(
      <>
        <_InternalMCPRegistrar
          moduleExports={{ [MODULE_KEY]: { createTools: () => tools } }}
          mcpToolsModuleInfo={mcpToolsModuleInfo}
          selfConfiguration={selfConfiguration}
          navigate={mockNavigate}
        />
        <HostGetTaskStatusTool />
      </>,
    );

  const startTask = (name: string) => registeredTools[name].execute({}, {});
  const pollTask = (taskId: string) =>
    registeredTools['getTaskStatus'].execute({ taskId }, {}) as Promise<
      TaskStatusReport & { taskId: string }
    >;

  it('registers the host getTaskStatus tool as read-only', () => {
    mountWithTasks([]);

    const listed = mockModelContext.listTools();
    expect(listed.map((t) => t.name)).toEqual(['getTaskStatus']);
    expect(listed[0].annotations).toEqual({ readOnlyHint: true });
    expect(listed[0].inputSchema).toEqual({
      type: 'object',
      properties: { taskId: { type: 'string' } },
      required: ['taskId'],
    });
  });

  it('routes a poll to the getTaskStatus of the tool that returned the taskId', async () => {
    const getTaskStatus = jest
      .fn()
      .mockResolvedValue(makeReport({ statusMessage: 'copying objects' }));
    mountWithTasks([makeTaskTool('startCopy', 'task-1', getTaskStatus)]);

    // The registrar must return the tool's own value untouched…
    await expect(startTask('startCopy')).resolves.toEqual({
      taskId: 'task-1',
      createdAt: CREATED_AT,
    });

    // …and remember the task so the host tool can reach its owner.
    await expect(pollTask('task-1')).resolves.toEqual({
      taskId: 'task-1',
      status: 'working',
      statusMessage: 'copying objects',
      createdAt: CREATED_AT,
      lastUpdatedAt: CREATED_AT,
      ttlMs: 60_000,
    });
    expect(getTaskStatus).toHaveBeenCalledTimes(1);
    expect(getTaskStatus).toHaveBeenCalledWith();
  });

  it('routes each taskId to its own owning tool', async () => {
    const firstStatus = jest.fn().mockResolvedValue(makeReport({ statusMessage: 'first' }));
    const secondStatus = jest
      .fn()
      .mockResolvedValue(makeReport({ status: 'completed', result: { done: 2 } }));
    mountWithTasks([
      makeTaskTool('startFirst', 'task-1', firstStatus),
      makeTaskTool('startSecond', 'task-2', secondStatus),
    ]);

    await startTask('startFirst');
    await startTask('startSecond');

    await expect(pollTask('task-2')).resolves.toMatchObject({
      taskId: 'task-2',
      status: 'completed',
      result: { done: 2 },
    });
    expect(firstStatus).not.toHaveBeenCalled();

    await expect(pollTask('task-1')).resolves.toMatchObject({
      taskId: 'task-1',
      statusMessage: 'first',
    });
    expect(secondStatus).toHaveBeenCalledTimes(1);
  });

  it('does not track a taskId from a tool that cannot report its status', async () => {
    mountWithTasks([makeTaskTool('startUntracked', 'task-1')]);

    await expect(startTask('startUntracked')).resolves.toEqual({
      taskId: 'task-1',
      createdAt: CREATED_AT,
    });

    await expect(pollTask('task-1')).resolves.toMatchObject({ status: 'cancelled' });
  });

  it.each([
    ['a plain result with no taskId', { result: 'ok' }],
    ['a non-string taskId', { taskId: 42, createdAt: CREATED_AT }],
    ['a null result', null],
  ])('does not track %s', async (_label, ret) => {
    const getTaskStatus = jest.fn().mockResolvedValue(makeReport());
    mountWithTasks([
      {
        ...makeTool({ name: 'startOdd', execute: jest.fn().mockResolvedValue(ret) }),
        getTaskStatus,
      },
    ]);

    await startTask('startOdd');

    expect(getTaskStatus).not.toHaveBeenCalled();
    await expect(pollTask('42')).resolves.toMatchObject({ status: 'cancelled' });
  });

  it('dedupes by taskId — the first owner keeps the task', async () => {
    const firstStatus = jest.fn().mockResolvedValue(makeReport({ statusMessage: 'first owner' }));
    const secondStatus = jest.fn().mockResolvedValue(makeReport({ statusMessage: 'second owner' }));
    mountWithTasks([
      makeTaskTool('startFirst', 'task-dup', firstStatus),
      makeTaskTool('startSecond', 'task-dup', secondStatus),
    ]);

    await startTask('startFirst');
    await startTask('startSecond');

    await expect(pollTask('task-dup')).resolves.toMatchObject({
      statusMessage: 'first owner',
    });
    expect(firstStatus).toHaveBeenCalledTimes(1);
    expect(secondStatus).not.toHaveBeenCalled();
  });

  it('reports a throwing getTaskStatus as a failed task instead of rejecting', async () => {
    // Guardian polls the host tool every 5s — an escaping rejection would break
    // that loop for every task, not just the broken one.
    const boom = jest.fn().mockRejectedValue(new Error('backend unreachable'));
    const healthy = jest.fn().mockResolvedValue(makeReport({ statusMessage: 'alive' }));
    mountWithTasks([
      makeTaskTool('startBroken', 'task-boom', boom),
      makeTaskTool('startHealthy', 'task-ok', healthy),
    ]);

    await startTask('startBroken');
    await startTask('startHealthy');

    await expect(pollTask('task-boom')).resolves.toMatchObject({
      taskId: 'task-boom',
      status: 'failed',
      statusMessage: expect.stringContaining('backend unreachable'),
      error: 'backend unreachable',
      ttlMs: 0,
    });

    // The sibling task is unaffected.
    await expect(pollTask('task-ok')).resolves.toMatchObject({
      taskId: 'task-ok',
      status: 'working',
      statusMessage: 'alive',
    });
  });

  it('evicts a task whose getTaskStatus threw, so it stops being retried', async () => {
    jest.useFakeTimers();
    const boom = jest.fn().mockRejectedValue(new Error('backend unreachable'));
    mountWithTasks([makeTaskTool('startBroken', 'task-boom', boom)]);

    await startTask('startBroken');
    await expect(pollTask('task-boom')).resolves.toMatchObject({ status: 'failed' });

    // ttlMs 0 → the failed entry is dropped on the next tick.
    jest.advanceTimersByTime(0);
    await expect(pollTask('task-boom')).resolves.toMatchObject({ status: 'cancelled' });
    expect(boom).toHaveBeenCalledTimes(1);
  });

  it('reports an unknown taskId as cancelled', async () => {
    mountWithTasks([]);

    await expect(pollTask('never-seen')).resolves.toMatchObject({
      taskId: 'never-seen',
      status: 'cancelled',
      statusMessage: expect.stringContaining('No such task'),
      ttlMs: 0,
    });
  });

  it('evicts a settled task after its ttlMs so a late poll returns cancelled', async () => {
    jest.useFakeTimers();
    const getTaskStatus = jest
      .fn()
      .mockResolvedValue(makeReport({ status: 'completed', ttlMs: 5_000 }));
    mountWithTasks([makeTaskTool('startCopy', 'task-1', getTaskStatus)]);

    await startTask('startCopy');
    await expect(pollTask('task-1')).resolves.toMatchObject({ status: 'completed' });

    // Still within the ttl — the task is alive and keeps reporting from its owner.
    jest.advanceTimersByTime(4_999);
    await expect(pollTask('task-1')).resolves.toMatchObject({ status: 'completed' });

    jest.advanceTimersByTime(1);
    await expect(pollTask('task-1')).resolves.toMatchObject({ status: 'cancelled' });
  });

  it('arms the eviction timer only once across repeated polls of a settled task', async () => {
    jest.useFakeTimers();
    const getTaskStatus = jest.fn().mockResolvedValue(makeReport({ status: 'failed' }));
    mountWithTasks([makeTaskTool('startCopy', 'task-1', getTaskStatus)]);

    await startTask('startCopy');
    await pollTask('task-1');
    await pollTask('task-1');
    await pollTask('task-1');

    // The `evicting` guard: one timer, not one per poll.
    expect(jest.getTimerCount()).toBe(1);
  });

  it('does not evict a task that is still working or waiting on input', async () => {
    jest.useFakeTimers();
    const working = jest.fn().mockResolvedValue(makeReport({ ttlMs: 1_000 }));
    const needsInput = jest
      .fn()
      .mockResolvedValue(makeReport({ status: 'input_required', ttlMs: 1_000 }));
    mountWithTasks([
      makeTaskTool('startWorking', 'task-1', working),
      makeTaskTool('startNeedsInput', 'task-2', needsInput),
    ]);

    await startTask('startWorking');
    await startTask('startNeedsInput');
    await pollTask('task-1');
    await pollTask('task-2');

    expect(jest.getTimerCount()).toBe(0);

    jest.advanceTimersByTime(10_000);
    await expect(pollTask('task-1')).resolves.toMatchObject({ status: 'working' });
    await expect(pollTask('task-2')).resolves.toMatchObject({ status: 'input_required' });
  });

  it('keeps the host tool registered after the app registrar unmounts', async () => {
    const getTaskStatus = jest.fn().mockResolvedValue(makeReport());
    const tools = [makeTaskTool('startCopy', 'task-1', getTaskStatus)];

    const { unmount } = renderWithQueryClient(
      <_InternalMCPRegistrar
        moduleExports={{ [MODULE_KEY]: { createTools: () => tools } }}
        mcpToolsModuleInfo={mcpToolsModuleInfo}
        selfConfiguration={selfConfiguration}
        navigate={mockNavigate}
      />,
    );
    renderWithQueryClient(<HostGetTaskStatusTool />);

    await startTask('startCopy');
    unmount();

    // The app's tools are gone, but its task is still pollable — that is why the
    // host tool lives on the shell's lifetime rather than per micro-app.
    expect(registeredTools['startCopy']).toBeUndefined();
    await expect(pollTask('task-1')).resolves.toMatchObject({
      taskId: 'task-1',
      status: 'working',
    });
  });
});
