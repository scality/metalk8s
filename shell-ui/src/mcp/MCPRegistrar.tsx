import '@mcp-b/global';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import { useEffect } from 'react';

declare const __webpack_public_path__: string;
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '../auth/AuthProvider';
import {
  FederatedModuleInfo,
  useConfigRetriever,
} from '../initFederation/ConfigurationProviders';
import { useDeployedApps } from '../initFederation/UIListProvider';
import type { MCPToolDefinition, ModelContextClient, ToolContext } from './types';

// Do not use directly - exported for testing purposes
export const _InternalMCPRegistrar = ({
  moduleExports,
  mcpToolsModuleInfo,
  selfConfiguration,
}: {
  moduleExports: Record<string, { tools: MCPToolDefinition[] }>;
  mcpToolsModuleInfo: FederatedModuleInfo;
  selfConfiguration: Record<string, unknown>;
}) => {
  const { getToken, userData } = useAuth();

  useEffect(() => {
    if (!navigator.modelContext) return;

    const tools = moduleExports[mcpToolsModuleInfo.module]?.tools ?? [];
    const registeredNames: string[] = [];

    for (const tool of tools) {
      navigator.modelContext.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: async (params: unknown, client: ModelContextClient) => {
          const context: ToolContext = {
            getToken,
            userData,
            selfConfiguration,
          };

          return tool.execute(
            { ...(params as Record<string, unknown>), context },
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
  }, [moduleExports, mcpToolsModuleInfo, getToken, userData, selfConfiguration]);

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
    document.head.appendChild(script);
    return () => script.remove();
  }, []);
}

export const MCPRegistrar = () => {
  useRelayEmbed();
  const deployedApps = useDeployedApps();
  const { retrieveConfiguration } = useConfigRetriever();

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
          <ErrorBoundary key={app.name} FallbackComponent={() => null}>
            <ComponentWithFederatedImports
              componentWithInjectedImports={_InternalMCPRegistrar}
              componentProps={{ mcpToolsModuleInfo, selfConfiguration }}
              renderOnError={null}
              federatedImports={[{ ...mcpToolsModuleInfo, remoteEntryUrl }]}
            />
          </ErrorBoundary>,
        ];
      })}
    </>
  );
};
