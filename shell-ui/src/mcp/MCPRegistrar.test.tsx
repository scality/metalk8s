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

const mockModelContext = {
  registerTool: jest.fn((tool: RegisteredTool) => {
    registeredTools[tool.name] = tool;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (navigator as any).modelContext = mockModelContext;
});

afterEach(() => {
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
    it('unregisters all tools on unmount', () => {
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

      unmount();

      expect(mockModelContext.listTools()).toHaveLength(0);
      expect(mockModelContext.unregisterTool).toHaveBeenCalledWith('tool1');
      expect(mockModelContext.unregisterTool).toHaveBeenCalledWith('tool2');
    });
  });

  describe('edge cases', () => {
    it('does nothing when navigator.modelContext is unavailable', () => {
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
