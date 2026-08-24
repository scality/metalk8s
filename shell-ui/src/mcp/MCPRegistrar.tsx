import '@mcp-b/global';
import type {
  ModelContextClient,
  ModelContextWithExtensions,
  ToolDescriptor,
} from '@mcp-b/webmcp-types';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import { useEffect, useMemo, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useQueryClient } from 'react-query';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import {
  type FederatedModuleInfo,
  useConfigRetriever,
} from '../initFederation/ConfigurationProviders';
import { useDeployedApps } from '../initFederation/UIListProvider';
import type { ToolContext } from './types';

declare const __webpack_public_path__: string;

// ── Background tasks (host-side aggregator) ────────────────────────────────────
// Follows the MCP ext-tasks shape. A tool opts in by returning a { taskId } from its
// execute() AND exposing an arg-less getTaskStatus() on its descriptor. Every app's
// tasks land in this ONE module-level list, and the single host `getTaskStatus` tool
// (registered once, see useHostGetTaskStatusTool) routes a polled taskId to the owning
// tool and stamps the id back on. Module-level so it is shared across every app's
// registrar instance.
type TaskStatus = 'working' | 'input_required' | 'completed' | 'failed' | 'cancelled';
type Task = {
  taskId: string;
  status: TaskStatus;
  statusMessage?: string;
  createdAt: string;
  lastUpdatedAt: string;
  ttlMs: number | null;
  pollIntervalMs?: number;
};
// What a tool's arg-less getTaskStatus() reports (shell-ui stamps the taskId).
type TaskStatusReport = Omit<Task, 'taskId'> & { result?: unknown; error?: unknown };
type HostTask = {
  taskId: string;
  createdAt: string;
  getStatus: () => Promise<TaskStatusReport>;
  // Set once the eviction timer is armed, so repeated polls of a settled task
  // don't queue one redundant timer per poll.
  evicting?: boolean;
};
const hostTasks: HostTask[] = []; // ordered — task 1 stays before task 2

// Do not use directly - exported for testing purposes (the list is module-level,
// so tests must drop leftovers between cases).
export const _resetHostTasks = () => {
  hostTasks.length = 0;
};

interface MCPToolDescriptor extends ToolDescriptor {
  getTaskStatus?: () => Promise<TaskStatusReport>;
}

type MCPToolsModule =
  | {
    /** New factory-based export — preferred. */
    createTools: (
      context: ToolContext,
      navigate: (path: string) => void,
    ) => MCPToolDescriptor[];
    tools?: never;
  }
  | {
    /** Legacy static-array export — kept for backward compatibility. */
    tools: MCPToolDescriptor[];
    createTools?: never;
  };

// Do not use directly - exported for testing purposes
export const _InternalMCPRegistrar = ({
  moduleExports,
  mcpToolsModuleInfo,
  selfConfiguration,
  navigate,
}: {
  // ComponentWithFederatedImports injects moduleExports as Record<string, unknown>
  moduleExports: Record<string, MCPToolsModule>;
  mcpToolsModuleInfo: FederatedModuleInfo;
  selfConfiguration: Record<string, unknown>;
  navigate: (path: string) => void;
}) => {
  const { getToken, userData } = useAuth();
  const queryClient = useQueryClient();

  // Keep auth refs current so tool execute() always reads fresh credentials
  // without causing the registration effect to re-run on every render.
  const getTokenRef = useRef(getToken);
  const userDataRef = useRef(userData);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  useEffect(() => { userDataRef.current = userData; }, [userData]);

  useEffect(() => {
    // Chrome 150 moved the modelContext getter from Navigator to Document
    // (webmachinelearning/webmcp#173 / PR #184). document.modelContext is now
    // canonical; navigator.modelContext is kept as a deprecated alias.
    const modelContext = document.modelContext || navigator.modelContext;
    if (!modelContext) return;

    const mod = moduleExports[mcpToolsModuleInfo.module] as MCPToolsModule | undefined;
    // Proxy getToken/userData through refs so execute() always uses the latest
    // values without requiring re-registration when auth state changes.
    const context: ToolContext = {
      get getToken() { return getTokenRef.current; },
      get userData() { return userDataRef.current; },
      selfConfiguration,
      queryClient,
    };
    // Prefer the new createTools factory (supports navigate + dynamic context);
    // fall back to the legacy static tools array for modules not yet migrated.
    const tools = mod?.createTools
      ? mod.createTools(context, navigate)
      : (mod?.tools ?? []);

    // Names already present in the context — registered by another federated app,
    // or left over from a StrictMode/HMR remount. registerTool throws on a
    // duplicate name, so we skip those rather than crash the registrar.
    // https://github.com/WebMCP-org/npm-packages/issues/231
    const existingNames = new Set(
      (modelContext as ModelContextWithExtensions).listTools?.().map((t) => t.name) ?? [],
    );

    // AbortController is the spec-blessed cleanup path: registerTool(tool, { signal })
    // unregisters the tool when the signal aborts. unregisterTool was removed from
    // the WebMCP spec on 2026-04-23 and is a no-op on native Chrome.
    const controller = new AbortController();

    for (const tool of tools) {
      if (existingNames.has(tool.name)) {
        console.debug(`[MCP] Tool "${tool.name}" already registered — skipping`);
        continue;
      }

      modelContext.registerTool(
        {
          name: tool.name,
          description: tool.description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          inputSchema: tool.inputSchema,
          ...(tool.annotations && { annotations: tool.annotations }),
          execute: async (params: unknown, client: ModelContextClient) => {
            // For createTools-based modules, context is already baked into the
            // tool's execute closure. For legacy tools, inject context here.
            const injectedContext = mod?.createTools ? undefined : context;

            // await → `ret` is the resolved result, not a Promise, so the taskId
            // check below inspects the actual value.
            const ret = await tool.execute(
              {
                ...(params as Record<string, unknown>),
                ...(injectedContext && { context: injectedContext }),
              },
              client,
            );

            // A background op just started: it returned a taskId AND this tool can
            // report its status. Register it in the shared host list (dedupe by id,
            // preserve order) so the single host `getTaskStatus` tool can route to it.
            if (ret instanceof Object && 'taskId' in ret && tool.getTaskStatus) {
              const { taskId, createdAt } = ret as Task;
              if (!hostTasks.some((h) => h.taskId === taskId)) {
                hostTasks.push({ taskId, createdAt, getStatus: () => tool.getTaskStatus!() });
              }
            }

            return ret;
          },
        },
        { signal: controller.signal },
      );

      // Track within this registration pass so the same name appearing twice in
      // one tools array doesn't throw either.
      existingNames.add(tool.name);
    }

    return () => controller.abort();
  }, [moduleExports, mcpToolsModuleInfo, selfConfiguration, navigate, queryClient]);

  return null;
};

// The ONE host tool Guardian polls. Registered ONCE (globally, on the shell's lifetime
// — not per micro-app) so it never gets unregistered while an app is still mounted.
// It routes the polled taskId to whichever tool owns it (via the shared hostTasks
// list), stamps the id back onto the result, and evicts a settled task after its ttlMs.
// Exported (as well as used by MCPRegistrar below) so tests can mount it standalone.
export function useHostGetTaskStatusTool() {
  useEffect(() => {
    const modelContext = document.modelContext || navigator.modelContext;
    if (!modelContext) return;

    // Idempotent across StrictMode/HMR remounts — reuse the duplicate-name skip.
    const existingNames = new Set(
      (modelContext as ModelContextWithExtensions).listTools?.().map((t) => t.name) ?? [],
    );
    if (existingNames.has('getTaskStatus')) return;

    const controller = new AbortController();
    modelContext.registerTool(
      {
        name: 'getTaskStatus',
        description:
          'Read-only. Poll a background task by its taskId to see whether it is still working, or has ' +
          'completed/failed. Works across every app. Returns an MCP task: status is "working" until it ' +
          'settles, then "completed" (with result) or "failed" (with error). An unknown taskId → "cancelled".',
        inputSchema: {
          type: 'object',
          properties: { taskId: { type: 'string' } },
          required: ['taskId'],
        },
        annotations: { readOnlyHint: true }, // silent, safe to poll
        execute: async (params: unknown) => {
          const { taskId } = (params as { taskId: string }) ?? { taskId: '' };
          const now = new Date().toISOString();
          const entry = hostTasks.find((h) => h.taskId === taskId);
          if (!entry) {
            return {
              taskId,
              status: 'cancelled' as TaskStatus,
              statusMessage: 'No such task (it may have finished and been evicted).',
              createdAt: now,
              lastUpdatedAt: now,
              ttlMs: 0,
            };
          }
          const task: Task = { taskId, ...(await entry.getStatus()) };
          if (
            task.status !== 'working' &&
            task.status !== 'input_required' &&
            !entry.evicting
          ) {
            // settled → evict after its ttl so a late poll returns cancelled, not stale data
            entry.evicting = true;
            setTimeout(() => {
              const i = hostTasks.findIndex((h) => h.taskId === taskId);
              if (i >= 0) hostTasks.splice(i, 1);
            }, task.ttlMs ?? 60_000);
          }
          return task;
        },
      },
      { signal: controller.signal },
    );

    return () => controller.abort();
  }, []);
}

// Inject the local-relay embed script once — must be a <script> tag (not an ES module import)
// so that document.currentScript.src is set, allowing widget.html to resolve locally
// instead of falling back to the CDN.
function useRelayEmbed() {
  useEffect(() => {
    if (document.querySelector('script[data-webmcp-relay-embed]')) return;
    const script = document.createElement('script');
    // __webpack_public_path__ is the runtime public path (e.g. '/shell/'),
    // ensuring the request hits the actual file rather than the SPA fallback.
    script.src = `${__webpack_public_path__}embed.js`;
    script.dataset.webmcpRelayEmbed = '1';
    script.dataset.requestTimeout = '120000'; // 2 min — tools can chain multiple API calls
    document.head.appendChild(script);
    return () => script.remove();
  }, []);
}

type DeployedApp = ReturnType<typeof useDeployedApps>[0];

// Extracted to a component so useMemo can stabilise selfConfiguration at hook
// call site rather than inside a flatMap callback where hooks are forbidden.
const AppMCPRegistrar = ({
  app,
  navigate,
}: {
  app: DeployedApp;
  navigate: (path: string) => void;
}) => {
  const { retrieveConfiguration } = useConfigRetriever();

  const buildConfig = retrieveConfiguration<'build'>({
    configType: 'build',
    name: app.name,
  });

  const runtimeConfig = retrieveConfiguration<Record<string, unknown>>({
    configType: 'run',
    name: app.name,
  });

  const mcpToolsModuleInfo = buildConfig?.spec.mcpTools;

  // Stabilise selfConfiguration: the ?? {} fallback would otherwise produce a
  // new object reference on every render, causing _InternalMCPRegistrar's
  // registration useEffect to fire unnecessarily.
  const rawSelfConfig = runtimeConfig?.spec
    ?.selfConfiguration as Record<string, unknown> | undefined;
  const selfConfiguration = useMemo(() => rawSelfConfig ?? {}, [rawSelfConfig]);

  if (!mcpToolsModuleInfo || !buildConfig) return null;

  const remoteEntryUrl = app.url + buildConfig.spec.remoteEntryPath;

  return (
    <ErrorBoundary fallbackRender={() => null}>
      <ComponentWithFederatedImports
        componentWithInjectedImports={_InternalMCPRegistrar}
        componentProps={{ mcpToolsModuleInfo, selfConfiguration, navigate }}
        renderOnError={null}
        // Headless registrar — it must never occupy layout. Has to be <></> rather than
        // null: the library resolves `renderOnLoading ?? <>Loading...</>`, so null and
        // undefined are swallowed by ?? and still render a bare "Loading..." text node,
        // which becomes a flex item above the navbar and shifts it on first load.
        renderOnLoading={<></>}
        federatedImports={[{ ...mcpToolsModuleInfo, remoteEntryUrl }]}
      />
    </ErrorBoundary>
  );
};

export const MCPRegistrar = () => {
  useRelayEmbed();
  useHostGetTaskStatusTool();
  const deployedApps = useDeployedApps();
  const navigate = useNavigate();

  return (
    <>
      {deployedApps.map((app) => (
        <AppMCPRegistrar key={app.name} app={app} navigate={navigate} />
      ))}
    </>
  );
};
