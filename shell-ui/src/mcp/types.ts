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
