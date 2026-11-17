// One object as the API returns it, with its events — the read behind the `describeKubeResource` MCP
// tool, as `kubectl describe` reads it. What the tools withhold from it is in mcpTools/disclosure.ts.
//
// Every kind is read the same way: discovery says whether the kind is served and namespaced, and one
// GET built from the kind and apiVersion reads the object.

import type { K8sApiClients } from './clients';
import {
  apiBaseFor,
  checkPlural,
  eventLastSeen,
  eventLastSeenMillis,
  failureFor,
  K8sApiError,
  normalizeKind,
} from './resources';

/** Whatever the API returned. Only the keys this file touches are named. */
type KubeObject = {
  metadata?: { name?: string; uid?: string } & Record<string, unknown>;
  spec?: unknown;
  status?: unknown;
} & Record<string, unknown>;

/** Enough to see a pattern; past that it is the same message with a later timestamp. */
export const MAX_EVENTS = 50;

type KubeEvent = {
  type?: string;
  reason?: string;
  count?: number;
  lastSeen?: string;
  message?: string;
};

type KubeDescription = {
  kind: string;
  apiVersion: string;
  name: string;
  namespace?: string;
  /**
   * The object as the API returned it, nothing withheld. Nested because the tool's answer has a
   * `status` of its own, which the object's would overwrite.
   */
  resource: KubeObject;
  /** null when the events could not be read; the description still succeeds. */
  events: KubeEvent[] | null;
  /** Why the events are null, when they are. */
  eventsUnavailable?: string;
  /** true when there were more than MAX_EVENTS and the oldest were dropped. */
  truncated: boolean;
};

type DescribeParams = {
  name: string;
  namespace?: string;
  includeEvents?: boolean;
};

/** The kind and apiVersion asked for, checked before anything is sent. */
type DescribeRequest = {
  /** The resource plural, as it goes into the path. */
  kind: string;
  apiVersion: string;
  /** `/api/v1` for the core group, `/apis/{group}/{version}` for every other. */
  base: string;
};

/** A request whose scope the API server has confirmed. */
export type DescribeTarget = DescribeRequest & { namespaced: boolean };

/** A name is an RFC 1123 subdomain and a namespace a label; both go into the path, so both are checked. */
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

const checkNamespaceFormat = (namespace: string) => {
  if (typeof namespace !== 'string' || namespace.length > 63 || !NAMESPACE.test(namespace)) {
    throw new K8sApiError(
      'malformed',
      `"${namespace}" is not a namespace. Namespaces are lower-case letters, digits and dashes.`,
    );
  }
};

/**
 * Kind and apiVersion, checked and turned into the API path they name, without any request.
 * apiVersion is required for every kind: the path is built from it.
 */
export const resolveDescribeRequest = (kind: unknown, apiVersion: unknown): DescribeRequest => {
  if (apiVersion === undefined || apiVersion === null || apiVersion === '') {
    throw new K8sApiError(
      'malformed',
      'apiVersion is required — "v1" for core kinds such as pods, "group/version" for any other. listKubeResources answers with the one to pass.',
    );
  }

  // A number would pass the plural check as "7" and only fail at the server.
  if (typeof kind !== 'string') {
    throw new K8sApiError('malformed', 'kind is the resource plural, as a string — "pods", "deployments".');
  }

  const plural = normalizeKind(kind);
  checkPlural(kind, plural);

  return { kind: plural, apiVersion: String(apiVersion), base: apiBaseFor(String(apiVersion)) };
};

/** Name, namespace and options checked without any request; the scope rule is checkScope's. */
export const checkDescribeParams = ({ name, namespace, includeEvents }: DescribeParams) => {
  checkName(name);
  if (namespace !== undefined) checkNamespaceFormat(namespace);

  // Refused rather than coerced: the string "false" is truthy.
  if (includeEvents !== undefined && typeof includeEvents !== 'boolean') {
    throw new K8sApiError('malformed', 'includeEvents is true or false.');
  }
};

/**
 * A namespace is required for a namespaced kind and refused for a cluster-scoped one rather than
 * ignored, which would answer about another object than the caller meant.
 */
const checkScope = (target: DescribeTarget, namespace?: string) => {
  if (target.namespaced && !namespace) {
    throw new K8sApiError('malformed', `${target.kind} are namespaced: a namespace is required.`);
  }
  if (!target.namespaced && namespace) {
    throw new K8sApiError(
      'malformed',
      `${target.kind} are cluster-scoped: they are not in a namespace, so do not pass one.`,
    );
  }
};

/** What `GET /api/v1` or `/apis/{group}/{version}` answers, as `kubectl api-resources` reads it. */
type APIResourceList = { resources?: { name?: string; namespaced?: boolean }[] };

/** Whether the API server serves this kind at this apiVersion, and whether it is namespaced. */
export const discoverTarget = async (clients: K8sApiClients, request: DescribeRequest): Promise<DescribeTarget> => {
  let served: APIResourceList;
  try {
    served = await clients.json<APIResourceList>(request.base);
  } catch (error) {
    const failure = failureFor(error);
    if (failure.status !== 'not_found') throw failure;
    throw new K8sApiError(
      'not_found',
      `${request.apiVersion} is not served by this cluster. List customresourcedefinitions for the apiVersions a custom kind serves.`,
    );
  }

  // Subresources are listed as "pods/log" and the like; only the resource itself matches.
  const resource = served?.resources?.find((candidate) => candidate?.name === request.kind);
  if (!resource) {
    throw new K8sApiError(
      'not_found',
      `"${request.kind}" is not served at ${request.apiVersion}. The kind is the resource plural, as listKubeResources answers with it.`,
    );
  }

  return { ...request, namespaced: resource.namespaced === true };
};

/** Discovery as a react-query definition, kept long: it only changes when an operator is installed. */
export const kubeDiscoveryQuery = (clients: K8sApiClients, request: DescribeRequest) => ({
  queryKey: ['kubeDiscovery', request.apiVersion, request.kind] as const,
  queryFn: () => discoverTarget(clients, request),
  staleTime: 10 * 60 * 1000,
  retry: false as const,
});

/** The object's events, selected by name and uid so another kind sharing the name is not mixed in. */
const readEvents = async (
  clients: K8sApiClients,
  target: DescribeTarget,
  name: string,
  namespace: string | undefined,
  uid: string | undefined,
) => {
  // Not for a node: the kubelet files a node's events with its NAME as uid, so the kind is pinned
  // instead, which catches both the kubelet's events and the node controller's.
  const byNode = target.kind === 'nodes' && target.apiVersion === 'v1';
  const selector = [
    `involvedObject.name=${name}`,
    ...(byNode ? ['involvedObject.kind=Node'] : uid ? [`involvedObject.uid=${uid}`] : []),
  ].join(',');

  const response = namespace
    ? await clients.coreV1.listNamespacedEvent(namespace, undefined, undefined, undefined, selector)
    : // A cluster-scoped object has no namespace to look in.
      await clients.coreV1.listEventForAllNamespaces(undefined, selector);

  const items = response?.body?.items;
  if (!Array.isArray(items)) {
    throw new K8sApiError('malformed', 'The Kubernetes API answered without a list of events.');
  }

  return items;
};

const projectEvent = (event: Parameters<typeof eventLastSeen>[0]): KubeEvent => {
  // Dated as kubectl dates it: events.k8s.io/v1 writers set neither lastTimestamp nor count.
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
 * Describes one object. Throws K8sApiError, so a react-query cache keeps only successes — except for
 * the events, whose failure is reported beside the object rather than failing the description.
 */
export const describeResource = async (
  clients: K8sApiClients,
  target: DescribeTarget,
  { name, namespace, includeEvents = true }: DescribeParams,
): Promise<KubeDescription> => {
  checkDescribeParams({ name, namespace, includeEvents });
  checkScope(target, namespace);

  // Checked above, encoded anyway.
  const path = `${target.base}${
    target.namespaced ? `/namespaces/${encodeURIComponent(namespace as string)}` : ''
  }/${target.kind}/${encodeURIComponent(name)}`;

  let object: KubeObject;
  try {
    object = await clients.json<KubeObject>(path);
  } catch (error) {
    throw failureFor(error);
  }

  // A 2xx that is not an object; a missing one is already a 404.
  if (!object?.metadata?.name) {
    throw new K8sApiError('malformed', 'The Kubernetes API answered without an object.');
  }

  let events: KubeEvent[] | null = null;
  let eventsUnavailable: string | undefined;
  let truncated = false;

  if (includeEvents) {
    try {
      const found = await readEvents(clients, target, name, namespace, object.metadata.uid);
      // Newest first, then cut: in the API's order, the oldest would be the ones kept.
      const ordered = [...found].sort((a, b) => eventLastSeenMillis(b) - eventLastSeenMillis(a));
      truncated = ordered.length > MAX_EVENTS;
      events = ordered.slice(0, MAX_EVENTS).map((event) => projectEvent(event as never));
    } catch (error) {
      // The object is still most of the answer, so the description does not fail with the events.
      events = null;
      eventsUnavailable = `The events for this object could not be read (${failureFor(error).status}). The description below is unaffected.`;
    }
  }

  return {
    kind: target.kind,
    apiVersion: target.apiVersion,
    name,
    ...(namespace ? { namespace } : {}),
    resource: object,
    events,
    ...(eventsUnavailable ? { eventsUnavailable } : {}),
    truncated,
  };
};

/** The description as a react-query definition, so every reader shares one cache. */
export const kubeDescriptionQuery = (clients: K8sApiClients, target: DescribeTarget, params: DescribeParams) => ({
  queryKey: [
    'kubeDescription',
    target.kind,
    target.apiVersion,
    params.namespace ?? '',
    params.name,
    params.includeEvents !== false,
  ] as const,
  queryFn: () => describeResource(clients, target, params),
  // Short: during a diagnosis the object and its events change.
  staleTime: 5000,
  retry: false as const,
});
