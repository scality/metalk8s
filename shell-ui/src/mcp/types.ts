// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in declare module augmentation below
import type { ModelContextExtensions, ToolDescriptor } from '@mcp-b/webmcp-types';

/**
 * WebMCP integration types.
 * ToolContext is the base typed contract passed by shell-ui to every tool's execute() call.
 * It contains only what shell-ui itself owns. Micro-frontends extend it with their own
 * app-specific context derived from selfConfiguration.
 */

export type ToolContext = {
  /**
   * Always returns the latest token — safe to call multiple times during
   * long-running tool executions where the token may be silently renewed
   * by oidc-client-ts in the background.
   */
  getToken: () => Promise<string>;
  /**
   * Raw selfConfiguration from the app's runtime WebFinger.
   * Micro-frontends cast this to their own known config shape to extract endpoints etc.
   */
  selfConfiguration: Record<string, unknown>;
};

/**
 * A tool definition exposed by a micro-frontend via its ./MCPTools federated module.
 *
 * execute() follows the WebMCP standard:
 *   - First arg: params spread with context injected by shell-ui as params.context
 *   - Second arg: the WebMCP client object (for requestUserInteraction, etc.)
 */
export interface MCPToolDefinition extends ToolDescriptor {
  /** When true, shell-ui will resolve a token and inject ToolContext before calling execute() */
  authRequired: boolean;
};

// Augment ModelContextCore (the type of navigator.modelContext) with the
// BrowserMcpServer runtime extensions always present after @mcp-b/global init.
declare module '@mcp-b/webmcp-types' {
  interface ModelContextCore extends ModelContextExtensions {}
}
