/**
 * WebMCP integration types.
 * ToolContext is the base typed contract passed by shell-ui to every tool's execute() call.
 * It contains only what shell-ui itself owns. Micro-frontends extend it with their own
 * app-specific context derived from selfConfiguration.
 */
import type { QueryClient } from 'react-query';
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
  /**
   * The shell-ui–owned QueryClient, shared across every federated app via
   * <QueryClientProvider contextSharing> (see FederatedApp.tsx). Tools use
   * this to keep the chat-side UI panels in sync with their mutations —
   * `invalidateQueries`, `setQueryData` for optimistic updates, or
   * `refetchQueries` — picking the strategy that fits the operation.
   */
  queryClient: QueryClient;
};
