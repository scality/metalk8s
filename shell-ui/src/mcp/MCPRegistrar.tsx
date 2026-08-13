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
import { useGuardianNotify } from '../guardian/GuardianContext';
import {
  type FederatedModuleInfo,
  useConfigRetriever,
} from '../initFederation/ConfigurationProviders';
import { useDeployedApps } from '../initFederation/UIListProvider';
import type { ToolContext } from './types';

declare const __webpack_public_path__: string;

type MCPToolsModule =
  | {
      /** New factory-based export — preferred. */
      createTools: (
        context: ToolContext,
        navigate: (path: string) => void,
      ) => ToolDescriptor[];
      tools?: never;
    }
  | {
      /** Legacy static-array export — kept for backward compatibility. */
      tools: ToolDescriptor[];
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
  // Lets a tool report the outcome of BACKGROUND work into the chat, after its
  // execute() has already returned. Stable identity — safe as an effect dep.
  const notify = useGuardianNotify();

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
      notify,
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

            return tool.execute(
              {
                ...(params as Record<string, unknown>),
                ...(injectedContext && { context: injectedContext }),
              },
              client,
            );
          },
        },
        { signal: controller.signal },
      );

      // Track within this registration pass so the same name appearing twice in
      // one tools array doesn't throw either.
      existingNames.add(tool.name);
    }

    return () => controller.abort();
  }, [moduleExports, mcpToolsModuleInfo, selfConfiguration, navigate, queryClient, notify]);

  return null;
};

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
