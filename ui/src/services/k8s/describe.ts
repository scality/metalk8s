// One object in full, and what the cluster has been saying about it — the read behind the
// `describeKubeResource` MCP tool.
//
// Where `listResources` answers "what exists", this answers "what is wrong with this one". It keeps
// the object's own `spec` and `status` as the API returned them, minus the parts that are bulk
// rather than information, and adds the events attached to it, which are usually the actual reason
// anyone is describing it.

import type { V1Node, V1ObjectMeta, V1Pod } from '@kubernetes/client-node';
import type { K8sApiClients } from './api';
import {
  eventLastSeen,
  failureFor,
  K8sApiError,
  KINDS,
  type KubeResourceItem,
  type KubeTarget,
  projectItem,
} from './resources';

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
  /** The row this object would have in a list, built by the same code. */
  summary: KubeResourceItem;
  /**
   * The object as the API holds it, minus what `omitted` names.
   *
   * Nested rather than spread across the top level because a tool's answer already has a `status` —
   * ok, or why not — and a Kubernetes object has one too. Flat, one would quietly overwrite the
   * other, and a caller could not tell a healthy object from a successful call.
   */
  resource: { metadata?: unknown; spec?: unknown; status?: unknown };
  /** null when the events could not be read — which is not a failure of the description. */
  events: KubeEvent[] | null;
  /** Why the events are null, when they are. */
  eventsUnavailable?: string;
  /** true ⇒ there were more than MAX_EVENTS and the oldest were dropped. */
  truncated: boolean;
  /** What was left out of the object, so nothing absent is read as empty. */
  omitted: string[];
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

/** An annotation holding a copy of the whole object, which `spec` already is. */
const LAST_APPLIED = 'kubectl.kubernetes.io/last-applied-configuration';

const pruneMetadata = (metadata: V1ObjectMeta | undefined, omitted: string[]) => {
  if (!metadata) return metadata;

  const { managedFields, annotations, ...kept } = metadata as V1ObjectMeta & {
    managedFields?: unknown[];
  };
  // Most of the bytes of a long-lived object, and none of the information: who last touched which
  // field, field by field.
  if (managedFields) omitted.push('metadata.managedFields');

  if (!annotations) return kept;

  const { [LAST_APPLIED]: lastApplied, ...rest } = annotations;
  if (lastApplied) omitted.push(`metadata.annotations["${LAST_APPLIED}"]`);

  return { ...kept, annotations: rest };
};

/**
 * The pod spec, with environment values dropped and their names kept.
 *
 * Excluding Secrets is necessary and not sufficient: a pod spec can hold a password in a plain env
 * value. The names and any `valueFrom` reference survive, which is what a diagnosis actually reads —
 * that a variable is set, and where it comes from.
 */
const pruneSpec = (target: KubeTarget, spec: unknown, omitted: string[]): unknown => {
  if (target.kind !== 'pods' || !spec) return spec;

  const podSpec = spec as V1Pod['spec'];
  let redacted = false;

  const strip = (containers: unknown) => {
    if (!Array.isArray(containers)) return containers;

    return containers.map((container) => {
      const env = (container as { env?: { name?: string; value?: string }[] })?.env;
      if (!Array.isArray(env)) return container;

      return {
        ...(container as object),
        env: env.map((variable) => {
          const { value, ...withoutValue } = variable ?? {};
          if (value !== undefined) redacted = true;
          return withoutValue;
        }),
      };
    });
  };

  const containers = strip(podSpec?.containers);
  const initContainers = strip(podSpec?.initContainers);
  if (redacted) omitted.push('env values in spec (names kept)');

  return {
    ...podSpec,
    ...(podSpec?.containers ? { containers } : {}),
    ...(podSpec?.initContainers ? { initContainers } : {}),
  };
};

const pruneStatus = (target: KubeTarget, status: unknown, omitted: string[]): unknown => {
  if (target.kind !== 'nodes' || !status) return status;

  const { images, ...kept } = status as NonNullable<V1Node['status']>;
  // Every image on the node with every tag it answers to — tens of kilobytes, and never the answer.
  if (images) omitted.push('status.images');

  return kept;
};

/**
 * The events attached to this object.
 *
 * Read with a field selector on the object's own name and uid: the uid is what keeps a Deployment's
 * events from being reported against a Service that happens to share its name.
 */
const readEvents = async (
  clients: K8sApiClients,
  name: string,
  namespace: string | undefined,
  uid: string | undefined,
) => {
  const selector = [`involvedObject.name=${name}`, ...(uid ? [`involvedObject.uid=${uid}`] : [])].join(',');

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

  checkName(name);
  checkNamespace(target, namespace);

  let object: { metadata?: V1ObjectMeta; spec?: unknown; status?: unknown };
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

  const omitted: string[] = [];

  let events: KubeEvent[] | null = null;
  let eventsUnavailable: string | undefined;
  let truncated = false;

  if (includeEvents) {
    try {
      const found = await readEvents(clients, name, namespace, object.metadata.uid);
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
    // The row this object would have in a list, built by the same code, so the two tools say the
    // same thing about the same object.
    summary: projectItem(entry, object),
    resource: {
      metadata: pruneMetadata(object.metadata, omitted),
      spec: pruneSpec(target, object.spec, omitted),
      status: pruneStatus(target, object.status, omitted),
    },
    events,
    ...(eventsUnavailable ? { eventsUnavailable } : {}),
    truncated,
    omitted,
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
