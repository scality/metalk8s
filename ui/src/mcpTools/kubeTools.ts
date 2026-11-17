// What every Kubernetes tool shares: worded failures, the refusal of credential-holding groups, and
// clients carrying the signed-in user's token. In mcpTools/ because it depends on ToolContext and
// holds tool policy the service layer should not apply to its other callers.

import { type K8sApiClients, k8sApi } from '../services/k8s/clients';
import { ALLOWED_KINDS, K8sApiError, type K8sFailureKind } from '../services/k8s/resources';
import type { MetalK8sSelfConfiguration, ToolContext } from './types';

/** What a caller is told per failure, when the failure carries no detail of its own. */
const EXPLAIN: Record<K8sFailureKind, string> = {
  session_expired: 'Your session has expired. Sign in again, then retry once.',
  // Spelled out: reported as "nothing there", a permissions problem becomes a wrong diagnosis.
  not_authorized:
    'Your Kubernetes permissions (RBAC) do not allow this. This does NOT mean the resources are ' +
    'absent — say you could not look, never that there was nothing there.',
  not_found: 'There is no such resource in this cluster.',
  unavailable: 'The Kubernetes API could not be reached, or answered unusably.',
  malformed: 'The request could not be formed as the Kubernetes API requires.',
};

/** The shape a tool returns when it could not answer. */
export const refusal = (error: K8sApiError, { allowedKinds = true }: { allowedKinds?: boolean } = {}) => ({
  status: error.status,
  // The detail alone when there is one: EXPLAIN in front of it could contradict it, blaming RBAC for
  // a policy of ours.
  message: error.detail ?? EXPLAIN[error.status],
  // For a tool with a fixed set of kinds: the next call can pick from them instead of guessing.
  ...(allowedKinds && error.status === 'not_found' ? { allowedKinds: ALLOWED_KINDS } : {}),
});

/**
 * Groups refused by describeKubeResource, because their objects hold credentials in their own
 * fields: Dex stores its signing keys, client secrets and password hashes as custom resources.
 */
const CREDENTIAL_GROUPS = ['dex.coreos.com'];

const normalise = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

/** The group of an apiVersion; empty for a core one such as `v1`. */
const groupOf = (apiVersion?: string) => {
  const parts = normalise(apiVersion).split('/');
  return parts.length === 2 ? parts[0] : '';
};

// Never throws, whatever the input: a guard that throws on what it exists to catch is no guard.
export const isCredentialGroup = (apiVersion?: string) => CREDENTIAL_GROUPS.includes(groupOf(apiVersion));

export const credentialGroupRefusal = () =>
  new K8sApiError(
    'not_authorized',
    "Dex's resources hold signing keys and password hashes in their own fields, so they are never described by this tool, whatever your permissions allow. listKubeResources shows their names; if what one holds matters, ask the user to look at it themselves.",
  );

/** The clients, built from the tool's context. Throws K8sApiError, so a tool has one error path. */
export const kubeClients = async (context: ToolContext): Promise<K8sApiClients> => {
  const { url } = (context.selfConfiguration ?? {}) as MetalK8sSelfConfiguration;
  if (!url) {
    throw new K8sApiError('unavailable', 'This deployment does not expose the Kubernetes API.');
  }

  // Per call: the token may have been renewed since the tools were registered.
  const token = await context.getToken();
  if (!token) throw new K8sApiError('session_expired');

  return k8sApi(url, token);
};
