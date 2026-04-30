import '@mcp-b/global';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

declare const __webpack_public_path__: string;
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '../auth/AuthProvider';
import {
  FederatedModuleInfo,
  useConfigRetriever,
} from '../initFederation/ConfigurationProviders';
import { useDeployedApps } from '../initFederation/UIListProvider';
import type { MCPToolDefinition, ModelContextClient, ToolContext } from './types';

type MCPToolsModule =
  | {
      /** New factory-based export — preferred. */
      createTools: (
        context: ToolContext,
        navigate: (path: string) => void,
      ) => MCPToolDefinition[];
      tools?: never;
    }
  | {
      /** Legacy static-array export — kept for backward compatibility. */
      tools: MCPToolDefinition[];
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
  moduleExports: Record<string, unknown>;
  mcpToolsModuleInfo: FederatedModuleInfo;
  selfConfiguration: Record<string, unknown>;
  navigate: (path: string) => void;
}) => {
  const { getToken, userData } = useAuth();

  // Keep auth refs current so tool execute() always reads fresh credentials
  // without causing the registration effect to re-run on every render.
  const getTokenRef = useRef(getToken);
  const userDataRef = useRef(userData);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  useEffect(() => { userDataRef.current = userData; }, [userData]);

  useEffect(() => {
    if (!navigator.modelContext) return;

    const mod = moduleExports[mcpToolsModuleInfo.module] as MCPToolsModule | undefined;
    // Proxy getToken/userData through refs so execute() always uses the latest
    // values without requiring re-registration when auth state changes.
    const context: ToolContext = {
      get getToken() { return getTokenRef.current; },
      get userData() { return userDataRef.current; },
      selfConfiguration,
    };
    // Prefer the new createTools factory (supports navigate + dynamic context);
    // fall back to the legacy static tools array for modules not yet migrated.
    const tools = mod?.createTools
      ? mod.createTools(context, navigate)
      : (mod?.tools ?? []);
    const registeredNames: string[] = [];

    for (const tool of tools) {
      navigator.modelContext.registerTool({
        name: tool.name,
        description: tool.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: tool.inputSchema as any,
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
      });

      registeredNames.push(tool.name);
    }

    return () => {
      registeredNames.forEach((name) =>
        navigator.modelContext?.unregisterTool?.(name),
      );
    };
  }, [moduleExports, mcpToolsModuleInfo, selfConfiguration, navigate]);

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

export const MCPRegistrar = () => {
  useRelayEmbed();
  const deployedApps = useDeployedApps();
  const { retrieveConfiguration } = useConfigRetriever();
  // Captured once per render — stable across registrations and passed into
  // createTools() so that navigateToRoute drives client-side navigation.
  const navigate = useNavigate();

  return (
    <>
      {deployedApps.flatMap((app) => {
        const buildConfig = retrieveConfiguration<'build'>({
          configType: 'build',
          name: app.name,
        });

        if (!buildConfig?.spec.mcpTools) return [];

        const runtimeConfig = retrieveConfiguration<Record<string, unknown>>({
          configType: 'run',
          name: app.name,
        });

        const mcpToolsModuleInfo = buildConfig.spec.mcpTools;
        const selfConfiguration =
          (runtimeConfig?.spec?.selfConfiguration as Record<string, unknown>) ??
          {};
        const remoteEntryUrl = app.url + buildConfig.spec.remoteEntryPath;

        return [
          <ErrorBoundary key={app.name} fallbackRender={() => null}>
            <ComponentWithFederatedImports
              componentWithInjectedImports={_InternalMCPRegistrar}
              componentProps={{ mcpToolsModuleInfo, selfConfiguration, navigate }}
              renderOnError={null}
              federatedImports={[{ ...mcpToolsModuleInfo, remoteEntryUrl }]}
            />
          </ErrorBoundary>,
        ];
      })}
    </>
  );
};
