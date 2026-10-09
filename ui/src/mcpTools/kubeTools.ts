// What every Kubernetes tool needs before it can ask the cluster anything: a worded failure, the
// refusal of Secrets, and a set of clients carrying the signed-in user's token.
//
// This lives in mcpTools/ rather than services/k8s/ on purpose. It depends on ToolContext, and the
// service layer should not know that tools exist — nor should it refuse Secrets on their behalf,
// since a caller that is not a tool may legitimately need to read one.

import { type K8sApiClients, k8sApi } from '../services/k8s/api';
import { ALLOWED_KINDS, K8sApiError, type K8sFailureKind } from '../services/k8s/resources';
import type { MetalK8sSelfConfiguration, ToolContext } from './types';

/**
 * What a caller is told, per failure. One sentence each, because each needs a different next step —
 * and one copy, so the same failure is worded the same way whichever tool hit it.
 *
 * Used when a failure arrives with no detail of its own — an HTTP status and nothing more. A
 * failure that carries a detail says something more specific, and that text is used instead.
 */
const EXPLAIN: Record<K8sFailureKind, string> = {
  session_expired: 'Your session has expired. Sign in again, then retry once.',
  // Spelled out because the two are easy to conflate in a summary, and conflating them turns a
  // permissions problem into a wrong diagnosis.
  not_authorized:
    'Your Kubernetes permissions (RBAC) do not allow this. This does NOT mean the resources are ' +
    'absent — say you could not look, never that there was nothing there.',
  not_found: 'There is no such resource in this cluster.',
  unavailable: 'The Kubernetes API could not be reached, or answered unusably.',
  malformed: 'The request could not be formed as the Kubernetes API requires.',
};

/** The shape a tool returns when it could not answer. */
export const refusal = (error: K8sApiError) => ({
  status: error.status,
  // The detail alone when there is one. EXPLAIN says what SORT of thing went wrong, and in front of
  // a detail that already names the specific thing it contradicts it — "your RBAC does not allow
  // this" ahead of "Secrets are never listed whatever your permissions allow" blames the cluster for
  // a policy of ours.
  message: error.detail ?? EXPLAIN[error.status],
  // Attached to every not_found, which is either a kind these tools do not know or an object the
  // cluster does not have. Either way the next call is a better one if the caller can see what is on
  // offer — one turn instead of a guessing loop.
  ...(error.status === 'not_found' ? { allowedKinds: ALLOWED_KINDS } : {}),
});

/**
 * Refused by the tools rather than by the service layer: never returning a Secret is their policy,
 * not a property of the cluster.
 */
const SECRET_KINDS = ['secret', 'secrets'];

// String(), for the same reason resolveTarget coerces: a guard that throws on the input it exists to
// catch is not a guard.
export const isSecretKind = (kind: string) =>
  SECRET_KINDS.includes(
    String(kind ?? '')
      .trim()
      .toLowerCase(),
  );

export const secretRefusal = () =>
  new K8sApiError(
    'not_authorized',
    'Secrets are never listed or read by this tool, whatever your permissions allow. If what a Secret holds matters, ask the user to look at it themselves.',
  );

/**
 * The clients, built from the tool's own context — no store and no hook in the path.
 *
 * Throws rather than returning a failure, so a tool keeps one error path: everything from here to
 * the answer raises K8sApiError, and the tool turns it into a refusal in one place.
 */
export const kubeClients = async (context: ToolContext): Promise<K8sApiClients> => {
  const { url } = (context.selfConfiguration ?? {}) as MetalK8sSelfConfiguration;
  if (!url) {
    throw new K8sApiError('unavailable', 'This deployment does not expose the Kubernetes API.');
  }

  // Read per call, not at registration: getToken returns the current token, which may have been
  // renewed in the background since the tools were registered.
  const token = await context.getToken();
  if (!token) throw new K8sApiError('session_expired');

  return k8sApi(url, token);
};
