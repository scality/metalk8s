import '@mcp-b/global';
import type { ModelContextClient } from '@mcp-b/webmcp-types';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import { OidcClient } from 'oidc-client-ts';
import { useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  getAbsoluteRedirectUrl,
  useAuth,
} from '../auth/AuthProvider';
import {
  type FederatedModuleInfo,
  type OIDCConfig,
  useConfigRetriever,
} from '../initFederation/ConfigurationProviders';
import { useDeployedApps } from '../initFederation/UIListProvider';
import type { MCPToolDefinition, ToolContext } from './types';

declare const __webpack_public_path__: string;

// Do not use directly - exported for testing purposes
export const _InternalMCPRegistrar = ({
  moduleExports,
  mcpToolsModuleInfo,
  selfConfiguration,
  authConfig,
}: {
  moduleExports: Record<string, { tools: MCPToolDefinition[] }>;
  mcpToolsModuleInfo: FederatedModuleInfo;
  selfConfiguration: Record<string, unknown>;
  authConfig: OIDCConfig | null;
}) => {
  const { userManager } = useAuth();

  useEffect(() => {
    if (!navigator.modelContext || !userManager) return;

    const tools = moduleExports[mcpToolsModuleInfo.module]?.tools ?? [];
    const registeredNames: string[] = [];

    for (const tool of tools) {
      navigator.modelContext.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: async (params: unknown, client: ModelContextClient) => {
          if (tool.authRequired) {
            let user = await userManager.getUser();

            if (!user || user.expired) {
              user = await userManager.signinSilent().catch(() => null);
            }

            if (!user || user.expired) {
              if (!authConfig) {
                return {
                  success: false,
                  error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Authentication required but no OIDC configuration is available',
                  },
                };
              }

              const oidcClient = new OidcClient({
                authority: authConfig.providerUrl,
                client_id: authConfig.clientId,
                redirect_uri: getAbsoluteRedirectUrl(authConfig.redirectUrl),
                response_type: authConfig.responseType || 'code',
                scope: authConfig.scopes,
              });

              // connector_id is passed as extraQueryParams rather than via MetadataServiceCtor
              // (which is UserManager-only). The effect on the final auth URL is identical.
              const signinRequest = await oidcClient.createSigninRequest({
                ...(authConfig.defaultDexConnector && {
                  extraQueryParams: { connector_id: authConfig.defaultDexConnector },
                }),
              });
              const authUrl = signinRequest.url;

              const authenticated = await client.requestUserInteraction(
                () => {
                  return new Promise<boolean>((resolve) => {
                    const modal = document.createElement('div');
                    modal.className = 'mcp-auth-modal';
                    modal.style.cssText =
                      'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:9999';
                    modal.innerHTML = `
                      <div style="background:#fff;padding:2rem;border-radius:8px;max-width:400px;text-align:center">
                        <h3 style="margin:0 0 1rem">Authentication Required</h3>
                        <p style="margin:0 0 1.5rem">This action requires you to sign in.</p>
                        <a href="${authUrl}" target="_blank" style="display:inline-block;padding:0.5rem 1.5rem;background:#0066cc;color:#fff;border-radius:4px;text-decoration:none;margin-bottom:1rem">Sign in to continue</a>
                        <br/>
                        <button id="mcp-cancel-auth" style="margin-top:0.5rem;padding:0.4rem 1rem;cursor:pointer">Cancel</button>
                      </div>
                    `;
                    document.body.appendChild(modal);

                    const onUserLoaded = () => {
                      modal.remove();
                      userManager.events.removeUserLoaded(onUserLoaded);
                      resolve(true);
                    };
                    userManager.events.addUserLoaded(onUserLoaded);

                    modal
                      .querySelector('#mcp-cancel-auth')
                      ?.addEventListener('click', () => {
                        userManager.events.removeUserLoaded(onUserLoaded);
                        modal.remove();
                        resolve(false);
                      });
                  });
                },
              );

              if (!authenticated) {
                return {
                  success: false,
                  error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Authentication required to perform this action',
                  },
                };
              }
            }
          }

          const context: ToolContext = {
            getToken: async () => {
              const user = await userManager.getUser();
              return user?.access_token ?? '';
            },
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
      registeredNames.map((name) =>
        navigator.modelContext?.unregisterTool?.(name),
      );
    };
  }, [moduleExports, mcpToolsModuleInfo, userManager, selfConfiguration, authConfig]);

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
        const auth = runtimeConfig?.spec?.auth;
        const authConfig =
          auth && (auth as { kind: string }).kind === 'OIDC'
            ? (auth as unknown as OIDCConfig)
            : null;
        const remoteEntryUrl = app.url + buildConfig.spec.remoteEntryPath;

        return [
          <ErrorBoundary key={app.name} FallbackComponent={() => null}>
            <ComponentWithFederatedImports
              componentWithInjectedImports={_InternalMCPRegistrar}
              componentProps={{ mcpToolsModuleInfo, selfConfiguration, authConfig }}
              renderOnError={null}
              federatedImports={[{ ...mcpToolsModuleInfo, remoteEntryUrl }]}
            />
          </ErrorBoundary>,
        ];
      })}
    </>
  );
};
