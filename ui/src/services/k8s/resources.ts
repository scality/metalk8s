// Listing one kind of Kubernetes resource, cut down to the parts that say whether it is healthy —
// the read behind the `listKubeResources` MCP tool, and usable by anything else that wants the same.
//
// Rows carry the object's own fields under the API's own names. Selection is for size: a raw pod is
// 3 kB and a cluster has hundreds.
//
// It deliberately does NOT use `handleUnAuthorizedError` from services/errorhandler: that helper
// collapses 401 and 403 into a single AuthError, and returns `{ error }` for everything else rather
// than throwing. A caller here needs those apart — "your session expired" and "your RBAC forbids
// this" lead to different places, and so does "there is no such kind" — so the status codes are
// mapped here instead.

import type {
  V1ConfigMap,
  V1Event,
  V1NodeSpec,
  V1NodeStatus,
  V1ObjectMeta,
  V1PersistentVolumeClaimSpec,
  V1PersistentVolumeSpec,
  V1PodSpec,
  V1ServiceSpec,
} from '@kubernetes/client-node';
import type { K8sApiClients } from './clients';

/**
 * What went wrong, in terms a caller can act on rather than an HTTP status it has to interpret.
 *
 * `not_authorized` and `not_found` must stay distinguishable: they are the difference between "you
 * cannot look" and "it is not there", which is the difference between a permissions problem and a
 * diagnosis.
 */
export type K8sFailureKind = 'session_expired' | 'not_authorized' | 'not_found' | 'unavailable' | 'malformed';

/** A failure with its kind kept, so a caller can act on it rather than parse a string. */
export class K8sApiError extends Error {
  constructor(
    readonly status: K8sFailureKind,
    /** What went wrong THIS time — the kind only says what sort of thing went wrong. */
    readonly detail?: string,
  ) {
    super(detail ? `${status}: ${detail}` : status);
    this.name = 'K8sApiError';
  }
}

/**
 * The browser fork rejects with `{ response, body }` rather than an exception type. Its response
 * exposes `statusCode` as a getter over the fetch `status`; both are read here, as
 * services/errorhandler already does, so either shape is understood.
 */
const statusCodeOf = (error: unknown): number | undefined => {
  const e = error as {
    response?: { statusCode?: number; status?: number };
    statusCode?: number;
    status?: number;
  };
  return e?.response?.statusCode ?? e?.response?.status ?? e?.statusCode ?? e?.status;
};

/** HTTP status → the kind a caller can act on. Anything unrecognised could not be reached usably. */
export const failureFor = (error: unknown): K8sApiError => {
  if (error instanceof K8sApiError) return error;
  switch (statusCodeOf(error)) {
    case 401:
      return new K8sApiError('session_expired');
    case 403:
      return new K8sApiError('not_authorized');
    case 404:
      return new K8sApiError('not_found');
    default:
      return new K8sApiError('unavailable');
  }
};

/** Above this many items the list is cut, and says so. Never a silent short list. */
export const MAX_ITEMS = 500;

/** One row. The fields differ per kind on purpose — see KINDS. */
export type KubeResourceItem = Record<string, unknown>;

export type KubeResourceList = {
  kind: string;
  /** Echoed only when the caller supplied one, i.e. when this went through CustomObjectsApi. */
  apiVersion?: string;
  /**
   * 'all' for namespaced kinds — nothing filters this list. Absent for a cluster-scoped kind, and
   * for a kind whose scope the items do not show.
   */
  namespace?: 'all';
  items: KubeResourceItem[];
  returned: number;
  /** true ⇒ MAX_ITEMS cut the list. `total` then says how many there were. */
  truncated: boolean;
  total?: number;
};

type ListResponse = { body?: { items?: unknown[] } };
type ReadResponse = { body?: unknown };

type KindEntry = {
  apiVersion: string;
  namespaced: boolean;
  list: (clients: K8sApiClients) => Promise<ListResponse>;
  /**
   * The same resource, one object of it, by the same route as `list` and for the same reasons:
   * a grouped kind goes through CustomObjectsApi so its JSON arrives untouched, a core one through
   * the generated client because there is no other way in. `namespace` is undefined for a
   * cluster-scoped kind.
   */
  read: (clients: K8sApiClients, name: string, namespace?: string) => Promise<ReadResponse>;
  /**
   * Which keys of the object, its metadata and its spec a row keeps, and — only where a status
   * carries something outsized — which keys of that.
   *
   * A reader of these rows knows Kubernetes, so the fields arrive as the API names them and are
   * read rather than rewritten. What is left out is bulk, not meaning: a pod's spec is its
   * containers, volumes and tolerations, which is most of its 3 kB and none of its health.
   */
  fields?: string[];
  metadata?: string[];
  spec?: string[];
  status?: string[];
  /** For the two kinds a list of keys cannot express. */
  project?: (item: never) => KubeResourceItem;
  /**
   * How to order the items before the list is cut, for a kind where time decides which rows matter.
   * The API server returns items in etcd key order — namespace, then name — so a plain cut at
   * MAX_ITEMS drops whole namespaces that sort late, however recent they are.
   */
  newestFirst?: (item: never) => number;
};

/** metadata.creationTimestamp arrives deserialised to a Date; the wire shape is ISO 8601. */
const iso = (value?: Date | string): string | undefined => (value instanceof Date ? value.toISOString() : value);

/**
 * When an event was last seen, resolved the way `kubectl get events` resolves it.
 *
 * Kept as code because it decides the ORDER events are cut in, which a caller cannot do after the
 * fact. The fields it reads are in the row too, so nothing is hidden behind it.
 */
export const eventLastSeen = (event: V1Event): Date | string | undefined =>
  event.lastTimestamp ?? event.series?.lastObservedTime ?? event.eventTime ?? event.metadata?.creationTimestamp;

const millis = (value?: Date | string): number => {
  const time = value === undefined ? Number.NaN : new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * One entry. A core-group kind passes the client's own types, so its key lists are checked against
 * them and a key that is not on V1PodSpec stops compiling — where a list and the real type disagree,
 * the real type is right. A kind listed through CustomObjectsApi passes none: its JSON is untouched
 * and carries fields the v1.13 models never declared, which is the point of listing it that way.
 */
const kind = <TSpec = never, TStatus = never, TItem = never>(entry: {
  apiVersion: string;
  namespaced: boolean;
  list: (clients: K8sApiClients) => Promise<ListResponse>;
  read: (clients: K8sApiClients, name: string, namespace?: string) => Promise<ReadResponse>;
  fields?: (keyof TItem)[];
  metadata?: (keyof V1ObjectMeta)[];
  spec?: (keyof TSpec)[];
  status?: (keyof TStatus)[];
  project?: (item: TItem) => KubeResourceItem;
  newestFirst?: (item: TItem) => number;
}): KindEntry => entry as unknown as KindEntry;

/**
 * The kinds that can be asked for by name alone, each mapped to the client method that lists it
 * across every namespace and the fields a row keeps.
 *
 * A kind in an API GROUP is listed through CustomObjectsApi rather than its generated method. The
 * generated ones run the response through ObjectSerializer, which builds a fresh object and copies
 * only the attributes the v1.13 models declare — so a Job's `suspend`, added in 1.21, is discarded
 * before anything here sees it, and a suspended Job reads as a stuck one. CustomObjectsApi hands the
 * JSON over untouched. Core-group kinds have no such route: /apis/{group}/{version} has no core
 * form, so pods, nodes and the rest come through the generated client and lose whatever Kubernetes
 * has added since 1.13.
 *
 * This is NOT the limit of what can be listed. Anything that lives in an API group is reachable by
 * passing its apiVersion — custom resources included — so the list is what needs no apiVersion
 * rather than what exists. `customresourcedefinitions` is in it so that a caller can find out what
 * the cluster defines and then ask for it, without a release shipping per CRD.
 *
 * Allowlisted rather than discovery-driven for one reason that matters: it makes excluding Secret a
 * wall rather than a filter.
 */
export const KINDS: Record<string, KindEntry> = {
  pods: kind<V1PodSpec>({
    apiVersion: 'v1',
    namespaced: true,
    list: (c) => c.coreV1.listPodForAllNamespaces(),
    read: (c, name, namespace) => c.coreV1.readNamespacedPod(name, namespace),
    spec: ['nodeName'],
  }),
  nodes: kind<V1NodeSpec, V1NodeStatus>({
    apiVersion: 'v1',
    namespaced: false,
    list: (c) => c.coreV1.listNode(),
    read: (c, name) => c.coreV1.readNode(name),
    // Labels, because that is where a node's roles are: `node-role.kubernetes.io/<role>`.
    metadata: ['labels'],
    // unschedulable is a cordon, and taints are the other half of why nothing schedules here.
    spec: ['unschedulable', 'taints'],
    // The one status worth narrowing: a node's carries `images`, every image on the box with every
    // tag it answers to.
    status: ['conditions', 'nodeInfo', 'capacity', 'allocatable', 'addresses'],
  }),
  deployments: kind({
    apiVersion: 'apps/v1',
    namespaced: true,
    list: (c) => c.customObjects.listClusterCustomObject('apps', 'v1', 'deployments'),
    read: (c, name, namespace) =>
      c.customObjects.getNamespacedCustomObject('apps', 'v1', namespace, 'deployments', name),
    spec: ['replicas'],
  }),
  statefulsets: kind({
    apiVersion: 'apps/v1',
    namespaced: true,
    list: (c) => c.customObjects.listClusterCustomObject('apps', 'v1', 'statefulsets'),
    read: (c, name, namespace) =>
      c.customObjects.getNamespacedCustomObject('apps', 'v1', namespace, 'statefulsets', name),
    spec: ['replicas'],
  }),
  daemonsets: kind({
    apiVersion: 'apps/v1',
    namespaced: true,
    list: (c) => c.customObjects.listClusterCustomObject('apps', 'v1', 'daemonsets'),
    read: (c, name, namespace) =>
      c.customObjects.getNamespacedCustomObject('apps', 'v1', namespace, 'daemonsets', name),
  }),
  jobs: kind({
    apiVersion: 'batch/v1',
    namespaced: true,
    list: (c) => c.customObjects.listClusterCustomObject('batch', 'v1', 'jobs'),
    read: (c, name, namespace) => c.customObjects.getNamespacedCustomObject('batch', 'v1', namespace, 'jobs', name),
    // completions and parallelism both: a work-queue job sets only the second, and the difference is
    // what says whether there is a total to count towards at all. `suspend` arrived in 1.21, which
    // is after this client was generated — it is here because the call above does not go through
    // the client's models.
    spec: ['completions', 'parallelism', 'suspend'],
  }),
  // batch/v1 for a second reason as well as the one above: this client's only CronJob method
  // addresses /apis/batch/v1beta1/cronjobs, a path the API server has not served since 1.25.
  cronjobs: kind({
    apiVersion: 'batch/v1',
    namespaced: true,
    list: (c) => c.customObjects.listClusterCustomObject('batch', 'v1', 'cronjobs'),
    read: (c, name, namespace) => c.customObjects.getNamespacedCustomObject('batch', 'v1', namespace, 'cronjobs', name),
    spec: ['schedule', 'suspend'],
  }),
  services: kind<V1ServiceSpec>({
    apiVersion: 'v1',
    namespaced: true,
    list: (c) => c.coreV1.listServiceForAllNamespaces(),
    read: (c, name, namespace) => c.coreV1.readNamespacedService(name, namespace),
    spec: ['type', 'clusterIP', 'ports', 'selector'],
  }),
  persistentvolumeclaims: kind<V1PersistentVolumeClaimSpec>({
    apiVersion: 'v1',
    namespaced: true,
    list: (c) => c.coreV1.listPersistentVolumeClaimForAllNamespaces(),
    read: (c, name, namespace) => c.coreV1.readNamespacedPersistentVolumeClaim(name, namespace),
    spec: ['volumeName', 'storageClassName', 'resources', 'accessModes'],
  }),
  persistentvolumes: kind<V1PersistentVolumeSpec>({
    apiVersion: 'v1',
    namespaced: false,
    list: (c) => c.coreV1.listPersistentVolume(),
    read: (c, name) => c.coreV1.readPersistentVolume(name),
    spec: ['capacity', 'storageClassName', 'persistentVolumeReclaimPolicy', 'claimRef', 'accessModes'],
  }),
  events: kind<never, never, V1Event>({
    apiVersion: 'v1',
    namespaced: true,
    list: (c) => c.coreV1.listEventForAllNamespaces(),
    read: (c, name, namespace) => c.coreV1.readNamespacedEvent(name, namespace),
    // An event has no spec or status; everything is on the object. series and eventTime are here
    // because an event written through events.k8s.io/v1 sets neither count nor lastTimestamp.
    fields: [
      'type',
      'reason',
      'message',
      'count',
      'lastTimestamp',
      'eventTime',
      'series',
      'involvedObject',
      'reportingComponent',
    ],
    newestFirst: (event: V1Event) => millis(eventLastSeen(event)),
  }),
  // Key NAMES only, which a list of keys cannot say. A ConfigMap can hold a connection string, and
  // excluding Secret does not make ConfigMap values safe to hand to a model.
  configmaps: kind<never, never, V1ConfigMap>({
    apiVersion: 'v1',
    namespaced: true,
    list: (c) => c.coreV1.listConfigMapForAllNamespaces(),
    read: (c, name, namespace) => c.coreV1.readNamespacedConfigMap(name, namespace),
    project: (configMap: V1ConfigMap) => ({ keys: Object.keys(configMap.data ?? {}) }),
  }),
  // apiextensions.k8s.io/v1, through CustomObjectsApi: this client's only CRD type is v1beta1, a
  // version the API server stopped serving in 1.22.
  //
  // Here so that a caller can discover what the cluster defines. Without it, reaching a custom
  // resource means knowing its group and version already — which a model does by memory or not at
  // all, and memory is how you end up asking for a version this cluster does not serve.
  customresourcedefinitions: kind<never, never, CustomResourceDefinition>({
    apiVersion: 'apiextensions.k8s.io/v1',
    namespaced: false,
    list: (c) => c.customObjects.listClusterCustomObject('apiextensions.k8s.io', 'v1', 'customresourcedefinitions'),
    read: (c, name) =>
      c.customObjects.getClusterCustomObject('apiextensions.k8s.io', 'v1', 'customresourcedefinitions', name),
    project: (crd: CustomResourceDefinition) => ({
      plural: crd.spec?.names?.plural,
      scope: crd.spec?.scope,
      // Joined here rather than left as a group and a list of versions: this is the exact string to
      // pass back as apiVersion, and nothing should have to assemble it to ask the next question.
      // Only the served ones — a version that is defined but not served answers 404.
      apiVersions: (crd.spec?.versions ?? [])
        .filter((version) => version.served)
        .map((version) => `${crd.spec?.group}/${version.name}`),
    }),
  }),
  namespaces: kind({
    apiVersion: 'v1',
    namespaced: false,
    list: (c) => c.coreV1.listNamespace(),
    read: (c, name) => c.coreV1.readNamespace(name),
  }),
};

/**
 * Keys whose value is bulk and never an answer: who owns which field, an image digest, a container
 * id. Dropped wherever they appear — a third of a pod's bytes, and nothing reads them.
 */
const NOISE = new Set(['managedFields', 'imageID', 'containerID']);

const withoutNoise = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutNoise);
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !NOISE.has(key))
      .map(([key, nested]) => [key, withoutNoise(nested)]),
  );
};

/** `{ status: … }` when there is anything to put there, and nothing at all when there is not. */
const pickInto = (key: string, source: unknown, keys?: string[]): Record<string, unknown> => {
  const picked = keys ? pick(source, keys) : (withoutNoise(source) as Record<string, unknown> | undefined);
  return picked && Object.keys(picked).length > 0 ? { [key]: picked } : {};
};

const pick = (source: unknown, keys?: string[]): Record<string, unknown> | undefined => {
  if (!keys?.length || !source || typeof source !== 'object') return undefined;

  const from = source as Record<string, unknown>;
  const picked = Object.fromEntries(
    keys.filter((key) => from[key] !== undefined).map((key) => [key, withoutNoise(from[key])]),
  );

  return Object.keys(picked).length > 0 ? picked : undefined;
};

type KubeObject = {
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: Date | string;
    deletionTimestamp?: Date | string;
  };
  spec?: unknown;
  status?: unknown;
};

/** What every object has, and what every row starts with. */
const identity = (object: KubeObject) => ({
  name: object?.metadata?.name,
  namespace: object?.metadata?.namespace,
  createdAt: iso(object?.metadata?.creationTimestamp),
  // Only when it is set — and then it is half the answer, because an object with one is on its way
  // out and goes on reporting whatever it was until it goes.
  ...(object?.metadata?.deletionTimestamp ? { deletionTimestamp: iso(object.metadata.deletionTimestamp) } : {}),
});

/** Everything an object carries beyond the identity above, less the noise and the duplication. */
const beyondIdentity = (object: KubeObject): Record<string, unknown> => {
  const { metadata, apiVersion, kind, ...rest } = object as KubeObject & { apiVersion?: string; kind?: string };
  return withoutNoise(rest) as Record<string, unknown>;
};

/** One row: what the object is, and the parts of it this kind keeps. */
const projectItem = (entry: KindEntry | undefined, item: unknown): KubeResourceItem => {
  const object = item as KubeObject;

  // A kind reached by apiVersion keeps everything. There is no list of keys to apply to a resource
  // nobody declared here, and guessing at `spec`/`status` would lose what these kinds are about:
  // a StorageClass keeps its provisioner and parameters at the top level, not under a spec at all.
  const row = entry
    ? {
        ...identity(object),
        ...pick(object, entry.fields),
        ...pick(object?.metadata, entry.metadata),
        ...(pick(object?.spec, entry.spec) ? { spec: pick(object?.spec, entry.spec) } : {}),
        // Status whole, unless the kind named the keys it wants. A status is small and it is the
        // half of an object that says how it is doing, so listing its keys buys about a hundred
        // bytes and costs a line per kind to keep in step with the API.
        ...(entry.status ? pickInto('status', object?.status, entry.status) : pickInto('status', object?.status)),
        ...(entry.project ? entry.project(item as never) : {}),
      }
    : { ...identity(object), ...beyondIdentity(object) };

  // A key with nothing behind it says nothing, and a cluster-scoped object has no namespace to
  // report. JSON drops these anyway; dropping them here means the object a caller holds is the one
  // that ships.
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
};

/** What a caller is shown when it names a kind this does not know. */
export const ALLOWED_KINDS = Object.keys(KINDS);

/**
 * kubectl's short names for the two kinds anyone writes short, resolved to the API's own plural.
 *
 * `kind` is a resource plural everywhere else — it has to be, for anything reached by apiVersion,
 * since it goes into the path — so the plurals are the keys, and these do not become a second
 * spelling anyone has to learn.
 */
const ALIASES: Record<string, string> = {
  pvc: 'persistentvolumeclaims',
  pv: 'persistentvolumes',
  crd: 'customresourcedefinitions',
  crds: 'customresourcedefinitions',
};

/**
 * A CustomResourceDefinition as apiextensions.k8s.io/v1 returns it. Declared here because the
 * generated client only knows the v1beta1 shape, which the API server no longer serves.
 */
type CustomResourceDefinition = {
  metadata?: { name?: string; creationTimestamp?: Date | string };
  spec?: {
    group?: string;
    scope?: string;
    names?: { plural?: string };
    versions?: { name?: string; served?: boolean }[];
  };
};

/** group/version, as CustomObjectsApi wants them: two arguments, never a path fragment. */
const parseApiVersion = (apiVersion: string): { group: string; version: string } => {
  const parts = String(apiVersion).split('/');
  const core = /^v[0-9]+((alpha|beta)[0-9]+)?$/;
  if (parts.length === 1 && core.test(parts[0])) return { group: '', version: parts[0] };
  if (parts.length === 2 && /^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/.test(parts[0]) && core.test(parts[1]))
    return { group: parts[0], version: parts[1] };
  throw new K8sApiError(
    'malformed',
    `"${apiVersion}" is not an apiVersion. It is either "group/version" (e.g. "apps/v1") or a bare core version (e.g. "v1").`,
  );
};

/** Which client answers this call, resolved before anything is sent. */
export type KubeTarget =
  | { kind: string; apiVersion: string; namespaced: boolean; entry: KindEntry; custom?: never }
  | {
      kind: string;
      apiVersion: string;
      /** Not known ahead of the call: an apiVersion says nothing about the kind's scope. */
      namespaced?: undefined;
      entry?: never;
      custom: { group: string; version: string; plural: string };
    };

/**
 * Resolve a kind to the client that can list it — purely, so a caller can refuse a bad request
 * before opening a connection.
 *
 * The order of the checks is the design, and the first failure stops it:
 *   1.  the kind is in the allowlist, or an apiVersion was supplied  → not_found, with the allowlist
 *   1b. the apiVersion parses                                        → malformed
 *
 * What a caller may ASK for is the caller's own business — listKubeResources refuses Secrets before
 * it gets here, because that is its policy and not a property of the cluster.
 */
export const resolveTarget = (kind: string, apiVersion?: string): KubeTarget => {
  // String(), because nothing guarantees a caller passed one: a number here would otherwise throw
  // out of a function whose whole job is to refuse bad input politely. Coerced, it reaches the
  // allowlist and comes back as the kind nobody has, with the list of the ones that exist.
  const spelled = String(kind ?? '')
    .trim()
    .toLowerCase();
  const normalized = ALIASES[spelled] ?? spelled;
  const entry = KINDS[normalized];

  if (!entry && !apiVersion) {
    throw new K8sApiError(
      'not_found',
      `"${kind}" is not one of the kinds this tool lists by name. If it lives in an API group, call again with its apiVersion and it will be fetched — that works for built-in kinds outside the list (e.g. "networking.k8s.io/v1" for ingresses) as much as for custom ones.`,
    );
  }

  // The allowlist answers when it can: the same resource, through a typed client, with the fields
  // that kind is worth reading. An apiVersion naming something ELSE routes to custom objects.
  if (entry && (!apiVersion || apiVersion === entry.apiVersion)) {
    return { kind: normalized, apiVersion: entry.apiVersion, namespaced: entry.namespaced, entry };
  }

  const { group, version } = parseApiVersion(apiVersion);

  // The core group is not reachable through CustomObjectsApi — it builds /apis/{group}/{version}/…,
  // which has no core form. Core kinds come from the allowlist or not at all.
  if (!group) {
    throw new K8sApiError(
      'not_found',
      `"${kind}" is not one of the core ("v1") kinds this tool lists by name, and the core group is the one apiVersion cannot reach. Kinds in an API GROUP are reachable — "networking.k8s.io/v1", "storage.metalk8s.scality.com/v1alpha1" — but core ones are limited to the list.`,
    );
  }

  // group and version are checked by parseApiVersion; the plural is the remaining path segment, and
  // it comes from the caller. A resource plural is a DNS label, so anything else is refused here
  // rather than relied on being encoded: encodeURIComponent leaves `.` alone, and an ingress that
  // normalises the URI before rewriting it can turn a traversal back into a path of its own.
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(normalized)) {
    throw new K8sApiError(
      'malformed',
      `"${kind}" is not a resource plural name — those are lower-case letters, digits and dashes.`,
    );
  }

  return {
    kind: normalized,
    apiVersion,
    custom: { group, version, plural: normalized },
  };
};

/**
 * List one kind.
 *
 * Throws K8sApiError, which is what makes this usable as a react-query `queryFn`: a failure is a
 * rejection, so only successes are cached.
 */
export const listResources = async (clients: K8sApiClients, target: KubeTarget): Promise<KubeResourceList> => {
  let response: ListResponse;
  try {
    response = target.entry
      ? await target.entry.list(clients)
      : await clients.customObjects.listClusterCustomObject(
          target.custom.group,
          target.custom.version,
          target.custom.plural,
        );
  } catch (error) {
    throw failureFor(error);
  }

  // A 200 whose body is not the shape the API promises. An empty list says `items: []`, so this is
  // never an empty cluster being reported as broken.
  const items = response?.body?.items;
  if (!Array.isArray(items)) {
    throw new K8sApiError('malformed', 'The Kubernetes API answered without a list of items.');
  }

  // Whether to say the list spans every namespace. The allowlist carries each kind's scope; a kind
  // reached by apiVersion does not, so it is read off the objects — claimed only when an item
  // carries a namespace, never inferred from an empty list.
  const namespaced = target.entry
    ? target.namespaced
    : items.some((item) => (item as { metadata?: { namespace?: string } })?.metadata?.namespace);

  const newestFirst = target.entry?.newestFirst;
  const ordered = newestFirst ? [...items].sort((a, b) => newestFirst(b as never) - newestFirst(a as never)) : items;

  const truncated = ordered.length > MAX_ITEMS;
  const kept = truncated ? ordered.slice(0, MAX_ITEMS) : ordered;

  return {
    kind: target.kind,
    // Echoed only for custom resources: it is the one thing the caller had to supply, and the thing
    // it most likely got wrong if the answer surprises it.
    ...(target.entry ? {} : { apiVersion: target.apiVersion }),
    ...(namespaced ? { namespace: 'all' as const } : {}),
    items: kept.map((item) => projectItem(target.entry, item)),
    returned: kept.length,
    truncated,
    ...(truncated ? { total: items.length } : {}),
  };
};

/**
 * This list as a react-query definition rather than a bare call, so whoever reads it — a tool, a
 * panel — shares one cache and one definition.
 *
 * It is the only user of this key. The nodes page keeps its own (`nodeKey.all`, hooks/nodes.ts),
 * whose queryFn and `select` both depend on hooks and on redux and so cannot be called from here.
 *
 * `retry: false` because listResources has already decided which failures are worth another try —
 * none of them are: a 403 does not become a 200 by asking three times.
 */
export const kubeResourcesQuery = (clients: K8sApiClients, target: KubeTarget) => ({
  queryKey: ['kubeResources', target.kind, target.apiVersion] as const,
  queryFn: () => listResources(clients, target),
  // Long enough to absorb a caller asking the same question twice in one breath, short enough that
  // a list read during a diagnosis is the cluster as it is now.
  staleTime: 5000,
  retry: false as const,
});
