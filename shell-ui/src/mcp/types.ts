/**
 * WebMCP integration types.
 * ToolContext is the base typed contract passed by shell-ui to every tool's execute() call.
 * It contains only what shell-ui itself owns. Micro-frontends extend it with their own
 * app-specific context derived from selfConfiguration.
 */
import type { UserData } from '../auth/AuthProvider';
export type { UserData };

export type ToolContext = {
  /**
   * Always returns the latest token — safe to call multiple times during
   * long-running tool executions where the token may be silently renewed
   * by oidc-client-ts in the background.
   */
  getToken: () => Promise<string | null>;
  /** Authenticated user information. Undefined if the user is not logged in. */
  userData: UserData | undefined;
  /**
   * Raw selfConfiguration from the app's runtime WebFinger.
   * Micro-frontends cast this to their own known config shape to extract endpoints etc.
   */
  selfConfiguration: Record<string, unknown>;
};

/**
 * Minimal type for the WebMCP client object passed as the second argument to execute().
 * The client is provided by the browser's WebMCP runtime.
 */
export type ModelContextClient = {
  requestUserInteraction: (
    fn: (client: ModelContextClient) => Promise<boolean>,
  ) => Promise<boolean>;
};

/**
 * A tool definition exposed by a micro-frontend via its ./MCPTools federated module.
 *
 * execute() follows the WebMCP standard:
 *   - First arg: params spread with context injected by shell-ui as params.context
 *   - Second arg: the WebMCP client object (for requestUserInteraction, etc.)
 */
export type MCPToolDefinition<
  TParams extends Record<string, unknown> = Record<string, unknown>,
> = {
  name: string;
  description: string;
  /** JSON Schema Draft 7 object describing the tool's input parameters (excluding context) */
  inputSchema: Record<string, unknown>;
  execute: (
    params: TParams & { context: ToolContext },
    client: ModelContextClient,
  ) => Promise<unknown>;
};

