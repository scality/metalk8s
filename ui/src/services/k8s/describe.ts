// One object in full, and what the cluster has been saying about it — the read behind the
// `describeKubeResource` MCP tool.
//
// Where `listResources` answers "what exists", this answers "what is wrong with this one". The
// object comes through as the API returned it — one of them fits, so there is nothing to save by
// cutting it down — and the events attached to it come with it, which are usually the actual reason
// anyone is describing it.

import type { K8sApiClients } from './api';
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
   * The object as the API returned it, minus what `omitted` names.
   *
   * Nested rather than spread across the top level because a tool's answer already has a `status` —
   * ok, or why not — and a Kubernetes object has one too. Flat, one would quietly overwrite the
   * other, and a caller could not tell a healthy object from a successful call.
   *
   * There is no summary beside it. The row listKubeResources would give for this object is a subset
   * of what is here, and a reader that can read the object does not need it read out first.
   */
  resource: KubeObject;
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

/**
 * Above this, the object sheds its known bulk rather than arriving whole.
 *
 * One object is not a list, so there is normally nothing to save by cutting it down. This is for the
 * ones that are outsized on their own: a node carrying every image on the box, an object whose
 * managed fields have grown for a year.
 *
 * Only bulk is shed, never content. A CRD's OpenAPI schema runs to hundreds of kilobytes and is not
 * on the list for that reason — it is what a CRD IS, and an object described without the thing it
 * describes would be worse than a large answer.
 */
export const MAX_OBJECT_BYTES = 128 * 1024;

/** An annotation holding a copy of the whole object, which `spec` already is. */
const LAST_APPLIED = 'kubectl.kubernetes.io/last-applied-configuration';

/** Wherever a pod template puts its containers, these are the arrays holding them. */
const CONTAINER_KEYS = new Set(['containers', 'initContainers', 'ephemeralContainers']);

const withoutEnvValues = (container: unknown, dropped: { any: boolean }): unknown => {
  const env = (container as { env?: { name?: string; value?: string }[] })?.env;
  if (!Array.isArray(env)) return container;

  return {
    ...(container as object),
    env: env.map((variable) => {
      const { value, ...withoutValue } = variable ?? {};
      if (value !== undefined) dropped.any = true;
      return withoutValue;
    }),
  };
};

/**
 * Environment values dropped, their names kept — wherever in the object the containers are.
 *
 * It walks rather than reaching for a path, because every kind puts its pod template somewhere
 * different: a Pod at `spec.containers`, a Deployment or Job at `spec.template.spec.containers`, a
 * CronJob at `spec.jobTemplate.spec.template.spec.containers`, and a custom resource that embeds a
 * template wherever its author chose.
 *
 * Not a size measure, and so not conditional on one: excluding Secrets is necessary and not
 * sufficient, because a pod spec can hold a password in a plain env value. The names and any
 * `valueFrom` reference survive, which is what a diagnosis reads — that a variable is set, and where
 * it comes from.
 */
const redactEnv = (value: unknown, dropped: { any: boolean }): unknown => {
  if (Array.isArray(value)) return value.map((nested) => redactEnv(nested, dropped));
  // A Date survives only by being returned as it is: entries() on one gives nothing back.
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) =>
      CONTAINER_KEYS.has(key) && Array.isArray(nested)
        ? [key, nested.map((container) => withoutEnvValues(container, dropped))]
        : [key, redactEnv(nested, dropped)],
    ),
  );
};

/**
 * A ConfigMap's values, dropped, its keys kept — the same stance the listing takes, for the same
 * reason: a ConfigMap holds a connection string as readily as a Secret does, and describing one is
 * no safer than listing it.
 */
const withoutConfigMapValues = (target: KubeTarget, object: KubeObject, omitted: string[]): KubeObject => {
  if (target.kind !== 'configmaps') return object;

  const { data, binaryData, ...rest } = object as KubeObject & {
    data?: Record<string, string>;
    binaryData?: Record<string, string>;
  };
  if (!data && !binaryData) return object;

  omitted.push('ConfigMap values (keys kept)');
  return { ...rest, dataKeys: [...Object.keys(data ?? {}), ...Object.keys(binaryData ?? {})] };
};

/**
 * The annotation `kubectl apply` writes: a verbatim JSON copy of the applied spec, env values and
 * all. Dropped every time rather than only when the object is outsized — redacting the spec and
 * leaving its copy behind would hand the values over anyway — and it says nothing `spec` does not.
 */
const withoutLastApplied = (object: KubeObject, omitted: string[]): KubeObject => {
  const metadata = object.metadata as Record<string, unknown> | undefined;
  const annotations = metadata?.annotations as Record<string, unknown> | undefined;
  if (!annotations?.[LAST_APPLIED]) return object;

  const { [LAST_APPLIED]: copy, ...kept } = annotations;
  omitted.push(`metadata.annotations["${LAST_APPLIED}"]`);
  return { ...object, metadata: { ...metadata, annotations: kept } };
};

/**
 * The bulk an outsized object sheds, biggest first, each named as it goes.
 *
 * `shed` returns the object UNCHANGED when there is nothing of its to drop — the caller compares by
 * identity to decide whether to name it, so rebuilding an equal object would have it reporting work
 * it did not do.
 */
const SHEDDABLE: { what: string; shed: (object: KubeObject) => KubeObject }[] = [
  {
    what: 'metadata.managedFields',
    shed: (object) => {
      const { metadata, ...rest } = object;
      const { managedFields, ...kept } = (metadata ?? {}) as Record<string, unknown>;
      return managedFields ? { ...rest, metadata: kept } : object;
    },
  },
  {
    what: 'status.images',
    shed: (object) => {
      const { status, ...rest } = object;
      const { images, ...kept } = (status ?? {}) as Record<string, unknown>;
      return images ? { ...rest, status: kept } : object;
    },
  },
];

/**
 * The object, whole, unless it is big enough that its known bulk is worth shedding.
 *
 * Raw is the default on purpose: one object fits, a reader of it knows Kubernetes, and anything cut
 * out here is something it cannot ask for again.
 */
const sizeDown = (object: KubeObject, omitted: string[]): KubeObject => {
  let result = object;
  if (JSON.stringify(result).length <= MAX_OBJECT_BYTES) return result;

  for (const { what, shed } of SHEDDABLE) {
    const next = shed(result);
    if (next === result) continue;

    omitted.push(what);
    result = next;
    if (JSON.stringify(result).length <= MAX_OBJECT_BYTES) break;
  }
  return result;
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

  const omitted: string[] = [];
  const dropped = { any: false };
  const redacted = redactEnv(object, dropped) as KubeObject;
  if (dropped.any) omitted.push('env values (names kept)');

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
    resource: sizeDown(withoutConfigMapValues(target, withoutLastApplied(redacted, omitted), omitted), omitted),
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
