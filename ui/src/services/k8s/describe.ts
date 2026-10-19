// One object in full, and what the cluster has been saying about it — the read behind the
// `describeKubeResource` MCP tool.
//
// Where `listResources` answers "what exists", this answers "what is wrong with this one". The
// object comes through as the API returned it, with the events attached to it, which are usually the
// actual reason anyone is describing it. What a caller may show of it is the caller's own business —
// see mcpTools/disclosure.ts for what the tools withhold.

import type { K8sApiClients } from './clients';
import { eventLastSeen, failureFor, K8sApiError, KINDS, type KubeTarget } from './resources';

/** Whatever the API returned. Only the keys this file touches are named. */
type KubeObject = {
  metadata?: { name?: string; uid?: string } & Record<string, unknown>;
  spec?: unknown;
  status?: unknown;
} & Record<string, unknown>;

/** Enough to see a pattern; past that it is the same message again with a later timestamp. */
export const MAX_EVENTS = 50;

export type KubeEvent = {
  type?: string;
  reason?: string;
  count?: number;
  lastSeen?: string;
  message?: string;
};

export type KubeDescription = {
  kind: string;
  name: string;
  namespace?: string;
  /**
   * The object as the API returned it.
   *
   * Nested rather than spread across the top level because a tool's answer already has a `status` —
   * ok, or why not — and a Kubernetes object has one too. Flat, one would quietly overwrite the
   * other, and a caller could not tell a healthy object from a successful call.
   *
   * There is no summary beside it, and nothing is withheld: what a particular caller may not show
   * is that caller's business. The MCP tools drop environment values and a ConfigMap's contents
   * before disclosing any of this to a model; a panel rendering the same object for the
   * administrator whose cluster it is may want exactly those.
   */
  resource: KubeObject;
  /** null when the events could not be read — which is not a failure of the description. */
  events: KubeEvent[] | null;
  /** Why the events are null, when they are. */
  eventsUnavailable?: string;
  /** true ⇒ there were more than MAX_EVENTS and the oldest were dropped. */
  truncated: boolean;
};

export type DescribeParams = {
  name: string;
  namespace?: string;
  includeEvents?: boolean;
};

/**
 * A resource name is an RFC 1123 subdomain and a namespace is a label. Checked because both are
 * path segments: the client encodes them, but encoding is not the same as validating, and a name is
 * never a path.
 */
const NAME = /^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/;
const NAMESPACE = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

const checkName = (name: string) => {
  if (typeof name !== 'string' || !name || name.length > 253 || name.includes('..') || !NAME.test(name)) {
    throw new K8sApiError(
      'malformed',
      `"${name}" is not a resource name. Names are lower-case letters, digits, dashes and dots — never a path.`,
    );
  }
};

/**
 * A namespace is required for a namespaced kind and refused for a cluster-scoped one, rather than
 * ignored: a caller that passes one to a node has misunderstood something, and silently dropping it
 * would hand back an answer about a different object than the one it believes it asked for.
 */
const checkNamespace = (target: KubeTarget, namespace?: string) => {
  if (target.namespaced) {
    if (!namespace) {
      throw new K8sApiError('malformed', `${target.kind} are namespaced: a namespace is required.`);
    }
    if (typeof namespace !== 'string' || namespace.length > 63 || !NAMESPACE.test(namespace)) {
      throw new K8sApiError(
        'malformed',
        `"${namespace}" is not a namespace. Namespaces are lower-case letters, digits and dashes.`,
      );
    }
    return;
  }

  if (namespace) {
    throw new K8sApiError(
      'malformed',
      `${target.kind} are cluster-scoped: they are not in a namespace, so do not pass one.`,
    );
  }
};

/**
 * Everything about a request that can be judged without asking the cluster anything.
 *
 * Exported so a caller can refuse a bad request before opening a connection — a name that is a path
 * should cost nothing, not a token refresh and a client.
 */
export const checkDescribeParams = (target: KubeTarget, { name, namespace, includeEvents }: DescribeParams) => {
  checkName(name);
  checkNamespace(target, namespace);

  // Refused rather than coerced, because there is no sensible coercion: the string "false" is
  // truthy, so taking it as given would read the events the caller asked to skip.
  if (includeEvents !== undefined && typeof includeEvents !== 'boolean') {
    throw new K8sApiError('malformed', 'includeEvents is true or false.');
  }
};

/**
 * The events attached to this object.
 *
 * Read with a field selector on the object's own name and uid: the uid is what keeps a Deployment's
 * events from being reported against a Service that happens to share its name.
 */
const readEvents = async (
  clients: K8sApiClients,
  kind: string,
  name: string,
  namespace: string | undefined,
  uid: string | undefined,
) => {
  // The uid narrows a name that two kinds may share — except on a node, where it would narrow the
  // answer away. The kubelet records a node's own events (Starting, NodeReady, NodeHasDiskPressure,
  // Rebooted) with involvedObject.uid set to the node's NAME; only the node controller uses the real
  // uid. kubectl describe node works around it by searching with ref.UID = node.Name; here the uid
  // is simply left out and the kind pinned instead, which catches both writers.
  const byNode = kind === 'nodes';
  const selector = [
    `involvedObject.name=${name}`,
    ...(byNode ? ['involvedObject.kind=Node'] : uid ? [`involvedObject.uid=${uid}`] : []),
  ].join(',');

  const response = namespace
    ? await clients.coreV1.listNamespacedEvent(namespace, undefined, undefined, undefined, selector)
    : // A node's events are not in its own namespace, because it has none.
      await clients.coreV1.listEventForAllNamespaces(undefined, selector);

  const items = response?.body?.items;
  if (!Array.isArray(items)) {
    throw new K8sApiError('malformed', 'The Kubernetes API answered without a list of events.');
  }

  return items;
};

const projectEvent = (event: Parameters<typeof eventLastSeen>[0]): KubeEvent => {
  // Dated the way kubectl dates it: an event written through events.k8s.io/v1 sets neither
  // lastTimestamp nor count in this view.
  const lastSeen = eventLastSeen(event);

  return {
    type: event.type,
    reason: event.reason,
    count: event.count ?? event.series?.count,
    lastSeen: lastSeen === undefined ? undefined : new Date(lastSeen).toISOString(),
    message: event.message,
  };
};

/**
 * Describe one object.
 *
 * Throws K8sApiError, which is what makes this usable as a react-query `queryFn`: a failure is a
 * rejection, so only successes are cached. The events are the exception — they are a second call,
 * and a description that failed entirely because that call was slow would be a bad trade.
 */
export const describeResource = async (
  clients: K8sApiClients,
  target: KubeTarget,
  { name, namespace, includeEvents = true }: DescribeParams,
): Promise<KubeDescription> => {
  const entry = target.entry;
  if (!entry) {
    throw new K8sApiError(
      'not_found',
      `"${target.kind}" can be listed but not described — describing is limited to the kinds this tool names.`,
    );
  }

  checkDescribeParams(target, { name, namespace, includeEvents });

  let object: KubeObject;
  try {
    const response = await entry.read(clients, name, namespace);
    object = response?.body as typeof object;
  } catch (error) {
    throw failureFor(error);
  }

  // A 2xx that is not an object. An absent one is a 404, which is already not_found.
  if (!object?.metadata?.name) {
    throw new K8sApiError('malformed', 'The Kubernetes API answered without an object.');
  }

  let events: KubeEvent[] | null = null;
  let eventsUnavailable: string | undefined;
  let truncated = false;

  if (includeEvents) {
    try {
      const found = await readEvents(clients, target.kind, name, namespace, object.metadata.uid);
      // Newest first, then cut: the API returns events in etcd key order, so the oldest would
      // otherwise be the ones that survive.
      const ordered = [...found].sort(
        (a, b) => (KINDS.events.newestFirst?.(b as never) ?? 0) - (KINDS.events.newestFirst?.(a as never) ?? 0),
      );
      truncated = ordered.length > MAX_EVENTS;
      events = ordered.slice(0, MAX_EVENTS).map((event) => projectEvent(event as never));
    } catch (error) {
      // Not a failure of the description. The object is still the answer to most of the question,
      // and losing it because a second call failed would be a worse trade than saying so.
      events = null;
      eventsUnavailable = `The events for this object could not be read (${failureFor(error).status}). The description below is unaffected.`;
    }
  }

  return {
    kind: target.kind,
    name,
    ...(namespace ? { namespace } : {}),
    resource: object,
    events,
    ...(eventsUnavailable ? { eventsUnavailable } : {}),
    truncated,
  };
};

/** The same description as a react-query definition, so a panel and a tool share one cache. */
export const kubeDescriptionQuery = (clients: K8sApiClients, target: KubeTarget, params: DescribeParams) => ({
  queryKey: [
    'kubeDescription',
    target.kind,
    params.namespace ?? '',
    params.name,
    params.includeEvents !== false,
  ] as const,
  queryFn: () => describeResource(clients, target, params),
  // Short: a description read during a diagnosis is the object as it is now, and the events move.
  staleTime: 5000,
  retry: false as const,
});
