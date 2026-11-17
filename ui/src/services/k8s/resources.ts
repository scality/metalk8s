// Listing one kind of Kubernetes resource the way `kubectl get <kind> -A -o wide` prints it — the
// read behind the `listKubeResources` MCP tool, and usable by anything else that wants the same.
//
// The API server prints it: asked for a Table, it answers with the very columns kubectl shows,
// computed server-side for every kind — built-in ones by their own printers, a custom resource by
// the additionalPrinterColumns its CRD declares. Nothing here words a kind's state; a list is read
// to find which object to look at, and describeKubeResource is where the rest of the object is.
//
// It deliberately does NOT use `handleUnAuthorizedError` from services/errorhandler: that helper
// collapses 401 and 403 into a single AuthError, and returns `{ error }` for everything else rather
// than throwing. A caller here needs those apart — "your session expired" and "your RBAC forbids
// this" lead to different places, and so does "there is no such kind" — so the status codes are
// mapped here instead.

import type { V1Event } from '@kubernetes/client-node';
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
export const statusCodeOf = (error: unknown): number | undefined => {
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

type KubeResourceList = {
  kind: string;
  /** What to pass describeKubeResource alongside kind, to read one of these back. */
  apiVersion: string;
  /**
   * 'all' for namespaced kinds — nothing filters this list. Absent for a cluster-scoped kind, and
   * for a kind whose scope the rows do not show.
   */
  namespace?: 'all';
  /**
   * One object per row, keyed by kubectl's column headers in camelCase — every column `-o wide`
   * shows, `namespace` and `name` first. A cell kubectl prints as `<none>`, or leaves empty, is left
   * out.
   */
  items: KubeResourceItem[];
  returned: number;
  /** true ⇒ MAX_ITEMS cut the list. `total` then says how many there were. */
  truncated: boolean;
  total?: number;
};

/** One row: `{ namespace, name, ready, status, … }`, values as the API server printed them. */
type KubeResourceItem = Record<string, unknown>;

/** A column this adds to the API server's own, read off the whole object. Named as its key. */
type ExtraColumn = { name: string; value: (object: never) => unknown };

type KindEntry = {
  apiVersion: string;
  namespaced: boolean;
  /** One object of this kind, as describeKubeResource reads it. */
  read?: (clients: K8sApiClients, name: string, namespace?: string) => Promise<{ body?: unknown }>;
  /**
   * How to order the rows before the list is cut, for a kind where time decides which rows matter.
   * The API server returns items in etcd key order — namespace, then name — so a plain cut at
   * MAX_ITEMS drops whole namespaces that sort late, however recent they are.
   */
  newestFirst?: (item: never) => number;
  /** Columns kubectl does not print but the next call needs. */
  extraColumns?: ExtraColumn[];
};

/**
 * When an event was last seen, resolved the way `kubectl get events` resolves it.
 *
 * Kept as code because it decides the ORDER events are cut in, which a caller cannot do after the
 * fact.
 */
export const eventLastSeen = (event: V1Event): Date | string | undefined =>
  event.lastTimestamp ?? event.series?.lastObservedTime ?? event.eventTime ?? event.metadata?.creationTimestamp;

/** eventLastSeen as milliseconds, for sorting: an event with no usable date sorts as the oldest. */
const eventLastSeenMillis = (event: V1Event): number => {
  const seen = eventLastSeen(event);
  const time = seen === undefined ? Number.NaN : new Date(seen).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/** One entry, its functions typed by the shape of the object they read. */
const kind = <TItem = never>(entry: {
  apiVersion: string;
  namespaced: boolean;
  read?: (clients: K8sApiClients, name: string, namespace?: string) => Promise<{ body?: unknown }>;
  newestFirst?: (item: TItem) => number;
  extraColumns?: { name: string; value: (object: TItem) => unknown }[];
}): KindEntry => entry as unknown as KindEntry;

/**
 * The kinds that can be asked for by name alone, each with the apiVersion it is listed at and its
 * scope.
 *
 * This is NOT the limit of what can be listed. Anything that lives in an API group is reachable by
 * passing its apiVersion — custom resources included — so the list is what needs no apiVersion
 * rather than what exists. `customresourcedefinitions` is in it so that a caller can find out what
 * the cluster defines and then ask for it, without a release shipping per CRD.
 *
 * Allowlisted rather than discovery-driven: the core group is reachable through these entries and no
 * other way.
 */
export const KINDS: Record<string, KindEntry> = {
  pods: kind({
    apiVersion: 'v1',
    namespaced: true,
    read: (c, name, namespace) => c.coreV1.readNamespacedPod(name, namespace),
  }),
  nodes: kind({
    apiVersion: 'v1',
    namespaced: false,
    read: (c, name) => c.coreV1.readNode(name),
  }),
  deployments: kind({
    apiVersion: 'apps/v1',
    namespaced: true,
    read: (c, name, namespace) =>
      c.customObjects.getNamespacedCustomObject('apps', 'v1', namespace, 'deployments', name),
  }),
  statefulsets: kind({
    apiVersion: 'apps/v1',
    namespaced: true,
    read: (c, name, namespace) =>
      c.customObjects.getNamespacedCustomObject('apps', 'v1', namespace, 'statefulsets', name),
  }),
  daemonsets: kind({
    apiVersion: 'apps/v1',
    namespaced: true,
    read: (c, name, namespace) =>
      c.customObjects.getNamespacedCustomObject('apps', 'v1', namespace, 'daemonsets', name),
  }),
  jobs: kind({
    apiVersion: 'batch/v1',
    namespaced: true,
    read: (c, name, namespace) => c.customObjects.getNamespacedCustomObject('batch', 'v1', namespace, 'jobs', name),
  }),
  cronjobs: kind({
    apiVersion: 'batch/v1',
    namespaced: true,
    read: (c, name, namespace) => c.customObjects.getNamespacedCustomObject('batch', 'v1', namespace, 'cronjobs', name),
  }),
  services: kind({
    apiVersion: 'v1',
    namespaced: true,
    read: (c, name, namespace) => c.coreV1.readNamespacedService(name, namespace),
  }),
  persistentvolumeclaims: kind({
    apiVersion: 'v1',
    namespaced: true,
    read: (c, name, namespace) => c.coreV1.readNamespacedPersistentVolumeClaim(name, namespace),
  }),
  persistentvolumes: kind({
    apiVersion: 'v1',
    namespaced: false,
    read: (c, name) => c.coreV1.readPersistentVolume(name),
  }),
  events: kind<V1Event>({
    apiVersion: 'v1',
    namespaced: true,
    read: (c, name, namespace) => c.coreV1.readNamespacedEvent(name, namespace),
    newestFirst: eventLastSeenMillis,
  }),
  // kubectl prints a ConfigMap's key COUNT, never its values: a ConfigMap can hold a connection
  // string, and so a ConfigMap's values are not safe to hand to a model.
  configmaps: kind({
    apiVersion: 'v1',
    namespaced: true,
    read: (c, name, namespace) => c.coreV1.readNamespacedConfigMap(name, namespace),
  }),
  // Listed as kubectl prints them — name, type and key COUNT, never a value. Nothing here asks for
  // the whole object (no newestFirst, no extraColumns), so the API server sends only metadata, and of
  // that only the namespace is read: its annotations can hold a copy of the data.
  secrets: kind({ apiVersion: 'v1', namespaced: true }),
  // kubectl prints a CRD's name and age only. The plural and the served apiVersions are what a
  // caller passes back to list the custom resource, so they are added — joined, because that is the
  // exact string to send, and only the served ones, since a version defined but not served is a 404.
  customresourcedefinitions: kind<CustomResourceDefinition>({
    apiVersion: 'apiextensions.k8s.io/v1',
    namespaced: false,
    read: (c, name) =>
      c.customObjects.getClusterCustomObject('apiextensions.k8s.io', 'v1', 'customresourcedefinitions', name),
    extraColumns: [
      { name: 'plural', value: (crd: CustomResourceDefinition) => crd.spec?.names?.plural },
      {
        name: 'apiVersions',
        value: (crd: CustomResourceDefinition) =>
          (crd.spec?.versions ?? [])
            .filter((version) => version.served)
            .map((version) => `${crd.spec?.group}/${version.name}`)
            .join(','),
      },
    ],
  }),
  namespaces: kind({
    apiVersion: 'v1',
    namespaced: false,
    read: (c, name) => c.coreV1.readNamespace(name),
  }),
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
 * The plural a caller meant: trimmed, lower-cased, and with kubectl's short names resolved.
 *
 * String(), because nothing guarantees a caller passed one: a number here would otherwise throw out
 * of a function whose whole job is to refuse bad input politely.
 */
const normalizeKind = (kind: unknown): string => {
  const spelled = String(kind ?? '')
    .trim()
    .toLowerCase();
  return ALIASES[spelled] ?? spelled;
};

/**
 * A resource plural is a DNS label, and it goes into a URL path, so anything else is refused rather
 * than relied on being encoded: encodeURIComponent leaves `.` alone, and an ingress that normalises
 * the URI before rewriting it can turn a traversal back into a path of its own.
 */
const checkPlural = (kind: string, plural: string) => {
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(plural)) {
    throw new K8sApiError(
      'malformed',
      `"${kind}" is not a resource plural name — those are lower-case letters, digits and dashes.`,
    );
  }
};

/** The parts of an apiextensions.k8s.io/v1 CustomResourceDefinition its extra columns read. */
type CustomResourceDefinition = {
  spec?: {
    group?: string;
    names?: { plural?: string };
    versions?: { name?: string; served?: boolean }[];
  };
};

/** An apiVersion split and checked: "group/version", or a bare core version such as "v1". */
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

/** `/api/v1` for the core group, `/apis/{group}/{version}` for every other — where a kind's paths start. */
const apiBaseFor = (apiVersion: string): string => {
  const { group, version } = parseApiVersion(apiVersion);
  return group ? `/apis/${group}/${version}` : `/api/${version}`;
};

/** Which kind and apiVersion this call reads, resolved before anything is sent. */
export type KubeTarget = {
  kind: string;
  apiVersion: string;
  /** The allowlist's scope for the kind; unknown ahead of the call for a kind reached by apiVersion. */
  namespaced?: boolean;
  /** The allowlist entry, when the kind is one; absent for a kind reached by apiVersion. */
  entry?: KindEntry;
};

/**
 * Resolve a kind to what to list — purely, so a caller can refuse a bad request before opening a
 * connection.
 *
 * The order of the checks is the design, and the first failure stops it:
 *   1. the kind is in the allowlist, or an apiVersion was supplied  → not_found, with the allowlist
 *   2. the apiVersion parses                                        → malformed
 *   3. it names an API group, since core kinds are the allowlist's  → not_found
 *   4. the kind is a plural, since it goes into the path            → malformed
 */
export const resolveTarget = (kind: string, apiVersion?: string): KubeTarget => {
  // Coerced by normalizeKind, a non-string reaches the allowlist and comes back as the kind nobody
  // has, with the list of the ones that exist.
  const normalized = normalizeKind(kind);
  const entry = KINDS[normalized];

  if (!entry && !apiVersion) {
    throw new K8sApiError(
      'not_found',
      `"${kind}" is not one of the kinds this tool lists by name. If it lives in an API group, call again with its apiVersion and it will be fetched — that works for built-in kinds outside the list (e.g. "networking.k8s.io/v1" for ingresses) as much as for custom ones.`,
    );
  }

  // The allowlist answers when it can. An apiVersion naming something ELSE is read as it says.
  if (entry && (!apiVersion || apiVersion === entry.apiVersion)) {
    return { kind: normalized, apiVersion: entry.apiVersion, namespaced: entry.namespaced, entry };
  }

  const { group } = parseApiVersion(apiVersion as string);

  // Core kinds come from the allowlist or not at all: an apiVersion opens API groups, not the core.
  if (!group) {
    throw new K8sApiError(
      'not_found',
      `"${kind}" is not one of the core ("v1") kinds this tool lists by name, and the core group is the one apiVersion cannot reach. Kinds in an API GROUP are reachable — "networking.k8s.io/v1", "storage.metalk8s.scality.com/v1alpha1" — but core ones are limited to the list.`,
    );
  }

  // group and version are checked by parseApiVersion; the plural is the remaining path segment, and
  // it comes from the caller.
  checkPlural(kind, normalized);

  return { kind: normalized, apiVersion: apiVersion as string };
};

/** What kubectl sends to be printed a Table, newest version first; plain JSON is the fallback. */
const TABLE =
  'application/json;as=Table;v=v1;g=meta.k8s.io,application/json;as=Table;v=v1beta1;g=meta.k8s.io,application/json';

/** A meta.k8s.io Table, as the API server prints a list for kubectl. */
type Table = {
  kind?: string;
  columnDefinitions?: { name?: string; priority?: number }[];
  rows?: { cells?: unknown[]; object?: { metadata?: { name?: string; namespace?: string } } }[];
  /** Only when the server could not print a Table and answered with the plain list instead. */
  items?: { metadata?: { name?: string; namespace?: string } }[];
};

/** kubectl's column header as an object key: "Nominated Node" → nominatedNode, "UP-TO-DATE" → upToDate. */
const keyFor = (header: unknown): string => {
  const words = String(header ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1))).join('');
};

/** What kubectl prints for "nothing here" — a key that says nothing is left out instead. */
const isEmpty = (value: unknown) => value === undefined || value === null || value === '' || value === '<none>';

/**
 * List one kind, as `kubectl get <kind> -A -o wide` prints it.
 *
 * Throws K8sApiError, which is what makes this usable as a react-query `queryFn`: a failure is a
 * rejection, so only successes are cached.
 */
export const listResources = async (clients: K8sApiClients, target: KubeTarget): Promise<KubeResourceList> => {
  const entry = target.entry;
  // The whole object rides along only when this needs it — to order events, or to add a column — and
  // never leaves this function. Otherwise its metadata is enough to say which namespace a row is in.
  const includeObject = entry?.newestFirst || entry?.extraColumns ? 'Object' : 'Metadata';

  let table: Table;
  try {
    table = await clients.json<Table>(
      `${apiBaseFor(target.apiVersion)}/${target.kind}`,
      { includeObject },
      {
        accept: TABLE,
      },
    );
  } catch (error) {
    throw failureFor(error);
  }

  // A server that cannot print a Table — an aggregated API, say — answers with the plain list, and a
  // name is all that can honestly be said of each item then.
  const printed = table?.kind === 'Table';
  const source = printed ? table.rows : table?.items?.map((item) => ({ cells: [item?.metadata?.name], object: item }));
  if (!Array.isArray(source)) {
    throw new K8sApiError('malformed', 'The Kubernetes API answered without a list of items.');
  }
  const keys = printed ? (table.columnDefinitions ?? []).map((column) => keyFor(column?.name)) : ['name'];

  // Whether to say the list spans every namespace. The allowlist carries each kind's scope; a kind
  // reached by apiVersion does not, so it is read off the rows — claimed only when a row carries a
  // namespace, never inferred from an empty list.
  const namespaced = entry ? entry.namespaced : source.some((row) => row?.object?.metadata?.namespace);

  const newestFirst = entry?.newestFirst;
  const ordered = newestFirst
    ? [...source].sort((a, b) => newestFirst(b?.object as never) - newestFirst(a?.object as never))
    : source;

  const truncated = ordered.length > MAX_ITEMS;
  const kept = truncated ? ordered.slice(0, MAX_ITEMS) : ordered;
  const extra = entry?.extraColumns ?? [];

  return {
    kind: target.kind,
    apiVersion: target.apiVersion,
    ...(namespaced ? { namespace: 'all' as const } : {}),
    items: kept.map((row) => {
      // namespace first, as -A prints it; a printed column that happens to share a key does not
      // overwrite it.
      const item: KubeResourceItem = namespaced ? { namespace: row?.object?.metadata?.namespace } : {};
      keys.forEach((key, index) => {
        if (!(key in item)) item[key] = row?.cells?.[index];
      });
      for (const column of extra) item[column.name] = column.value(row?.object as never);
      return Object.fromEntries(Object.entries(item).filter(([, value]) => !isEmpty(value)));
    }),
    returned: kept.length,
    truncated,
    ...(truncated ? { total: source.length } : {}),
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
