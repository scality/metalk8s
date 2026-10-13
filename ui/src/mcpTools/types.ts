/**
 * WebMCP integration types.
 *
 * ToolContext is the contract shell-ui passes to every tool's execute(): it contains only what
 * shell-ui itself owns, and this app extends it with what it reads from its own selfConfiguration.
 * Copied from shell-ui/src/mcp/types.ts, which is the definition both sides actually use — keep
 * them in step.
 */
import type { QueryClient } from 'react-query';

export type UserData = {
  token: string;
  username: string;
  groups: string[];
  email: string;
  id: string;
};

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

/**
 * The part of this app's selfConfiguration that the tools read, as the ScalityUIComponentExposer
 * declares it (salt/metalk8s/addons/ui/deployed/ui-operator-cr.sls).
 */
export type MetalK8sSelfConfiguration = {
  /** Base URL of the Kubernetes API proxy — `/api/kubernetes`. */
  url: string;
};
