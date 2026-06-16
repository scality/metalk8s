import type { ToolAnnotations, ToolDescriptor } from '@mcp-b/webmcp-types';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { QueryClient } from 'react-query';
import { QueryClientProvider } from '../QueryClientProvider';
import type { FederatedModuleInfo } from '../initFederation/ConfigurationProviders';
import { _InternalMCPRegistrar } from './MCPRegistrar';
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
