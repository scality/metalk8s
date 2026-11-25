// Lists one kind of Kubernetes resource as `kubectl get <kind> -A -o wide` prints it — the read
// behind the `listKubeResources` MCP tool.
//
// The API server does the printing: asked for a Table, it returns kubectl's columns for any kind,
// including a CRD's printer columns.
//
// Status codes are mapped here rather than through services/errorhandler, which merges 401 and 403:
// "session expired", "not allowed" and "no such kind" need different answers.

import type { V1Event } from '@kubernetes/client-node';
import type { K8sApiClients } from './clients';

/**
 * What went wrong, as a caller can act on it. `not_authorized` ("you cannot look") and `not_found`
 * ("it is not there") must stay distinct.
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

/** The HTTP status of a rejection, whichever shape the client rejected with. */
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

/** Above this many items the list is cut, and says so. */
export const MAX_ITEMS = 500;

type KubeResourceList = {
  kind: string;
  /** What to pass describeKubeResource with kind. */
  apiVersion: string;
  /** 'all' for a namespaced kind; absent for a cluster-scoped one. */
  namespace?: 'all';
  /** One object per row, keyed by kubectl's columns in camelCase, `<none>` cells left out. */
  items: KubeResourceItem[];
  returned: number;
  /** true when MAX_ITEMS cut the list; `total` then says how many there were. */
  truncated: boolean;
  total?: number;
};

type KubeResourceItem = Record<string, unknown>;

/** A column added to the printed ones, read off the whole object. */
type ExtraColumn = { name: string; value: (object: never) => unknown };

type KindEntry = {
  apiVersion: string;
  namespaced: boolean;
  /**
   * Sort key applied before the list is cut. The API returns items by namespace then name, so
   * without it the cut drops whole namespaces, however recent.
   */
  newestFirst?: (item: never) => number;
  /** Columns kubectl does not print but the next call needs. */
  extraColumns?: ExtraColumn[];
};

/** When an event was last seen, resolved as `kubectl get events` does. */
export const eventLastSeen = (event: V1Event): Date | string | undefined =>
  event.lastTimestamp ?? event.series?.lastObservedTime ?? event.eventTime ?? event.metadata?.creationTimestamp;

/** eventLastSeen in milliseconds; an event with no usable date sorts as the oldest. */
export const eventLastSeenMillis = (event: V1Event): number => {
  const seen = eventLastSeen(event);
  const time = seen === undefined ? Number.NaN : new Date(seen).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/** One entry, its functions typed by the shape of the object they read. */
const kind = <TItem = never>(entry: {
  apiVersion: string;
  namespaced: boolean;
  newestFirst?: (item: TItem) => number;
  extraColumns?: { name: string; value: (object: TItem) => unknown }[];
}): KindEntry => entry as unknown as KindEntry;

/**
 * The kinds listable by name alone. Any other kind in an API group is listed by passing its
 * apiVersion; core-group kinds are reachable only through this table.
 */
const KINDS: Record<string, KindEntry> = {
  pods: kind({ apiVersion: 'v1', namespaced: true }),
  nodes: kind({ apiVersion: 'v1', namespaced: false }),
  deployments: kind({ apiVersion: 'apps/v1', namespaced: true }),
  statefulsets: kind({ apiVersion: 'apps/v1', namespaced: true }),
  daemonsets: kind({ apiVersion: 'apps/v1', namespaced: true }),
  jobs: kind({ apiVersion: 'batch/v1', namespaced: true }),
  cronjobs: kind({ apiVersion: 'batch/v1', namespaced: true }),
  services: kind({ apiVersion: 'v1', namespaced: true }),
  persistentvolumeclaims: kind({ apiVersion: 'v1', namespaced: true }),
  persistentvolumes: kind({ apiVersion: 'v1', namespaced: false }),
  events: kind<V1Event>({
    apiVersion: 'v1',
    namespaced: true,
    newestFirst: eventLastSeenMillis,
  }),
  // kubectl prints the key count, never the values.
  configmaps: kind({ apiVersion: 'v1', namespaced: true }),
  // kubectl prints name, type and key count, never a value. Only metadata is requested, and only its
  // namespace is read: its annotations can hold a copy of the data.
  secrets: kind({ apiVersion: 'v1', namespaced: true }),
  // kubectl prints name and age only; the plural and served apiVersions are added because they are
  // what lists the custom resource.
  customresourcedefinitions: kind<CustomResourceDefinition>({
    apiVersion: 'apiextensions.k8s.io/v1',
    namespaced: false,
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
  namespaces: kind({ apiVersion: 'v1', namespaced: false }),
};

/** What a caller is shown when it names a kind this does not know. */
export const ALLOWED_KINDS = Object.keys(KINDS);

/** kubectl's short names, resolved to the plural the API uses. */
const ALIASES: Record<string, string> = {
  pvc: 'persistentvolumeclaims',
  pv: 'persistentvolumes',
  crd: 'customresourcedefinitions',
  crds: 'customresourcedefinitions',
};

/** The plural a caller meant: trimmed, lower-cased, short names resolved. Never throws. */
export const normalizeKind = (kind: unknown): string => {
  const spelled = String(kind ?? '')
    .trim()
    .toLowerCase();
  return ALIASES[spelled] ?? spelled;
};

/** A plural goes into the URL path, so anything that is not a DNS label is refused, not encoded. */
export const checkPlural = (kind: string, plural: string) => {
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(plural)) {
    throw new K8sApiError(
      'malformed',
      `"${kind}" is not a resource plural name — those are lower-case letters, digits and dashes.`,
    );
  }
};

/** The parts of a CustomResourceDefinition its extra columns read. */
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

/** Where a kind's paths start: `/api/v1` for the core group, `/apis/{group}/{version}` otherwise. */
export const apiBaseFor = (apiVersion: string): string => {
  const { group, version } = parseApiVersion(apiVersion);
  return group ? `/apis/${group}/${version}` : `/api/${version}`;
};

/** The kind and apiVersion a call reads, resolved before anything is sent. */
export type KubeTarget = {
  kind: string;
  apiVersion: string;
  /** The KINDS entry, when there is one. */
  entry?: KindEntry;
};

/**
 * Resolves a kind to what to list, without any request. Checks, in order:
 *   1. the kind is in KINDS, or an apiVersion was given          → not_found, with the allowlist
 *   2. the apiVersion parses                                     → malformed
 *   3. it names an API group, since core kinds are KINDS' only  → not_found
 *   4. the kind is a valid plural                                → malformed
 */
export const resolveTarget = (kind: string, apiVersion?: string): KubeTarget => {
  const normalized = normalizeKind(kind);
  const entry = KINDS[normalized];

  if (!entry && !apiVersion) {
    throw new K8sApiError(
      'not_found',
      `"${kind}" is not one of the kinds this tool lists by name. If it lives in an API group, call again with its apiVersion and it will be fetched — that works for built-in kinds outside the list (e.g. "networking.k8s.io/v1" for ingresses) as much as for custom ones.`,
    );
  }

  if (entry && (!apiVersion || apiVersion === entry.apiVersion)) {
    return { kind: normalized, apiVersion: entry.apiVersion, entry };
  }

  const { group } = parseApiVersion(apiVersion as string);
  if (!group) {
    throw new K8sApiError(
      'not_found',
      `"${kind}" is not one of the core ("v1") kinds this tool lists by name, and the core group is the one apiVersion cannot reach. Kinds in an API GROUP are reachable — "networking.k8s.io/v1", "storage.metalk8s.scality.com/v1alpha1" — but core ones are limited to the list.`,
    );
  }

  checkPlural(kind, normalized);
  return { kind: normalized, apiVersion: apiVersion as string };
};

/** The Accept header kubectl sends to get a Table, with plain JSON as the fallback. */
const TABLE =
  'application/json;as=Table;v=v1;g=meta.k8s.io,application/json;as=Table;v=v1beta1;g=meta.k8s.io,application/json';

/** A meta.k8s.io Table, or the plain list a server that cannot print one returns instead. */
type Table = {
  kind?: string;
  columnDefinitions?: { name?: string; priority?: number }[];
  rows?: { cells?: unknown[]; object?: { metadata?: { name?: string; namespace?: string } } }[];
  items?: { metadata?: { name?: string; namespace?: string } }[];
};

/** A column header as an object key: "Nominated Node" → nominatedNode, "UP-TO-DATE" → upToDate. */
const keyFor = (header: unknown): string => {
  const words = String(header ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1))).join('');
};

/** A cell that says nothing, left out of the item. */
const isEmpty = (value: unknown) => value === undefined || value === null || value === '' || value === '<none>';

/**
 * Lists one kind, as `kubectl get <kind> -A -o wide` prints it. Throws K8sApiError, so a react-query
 * cache keeps only successes.
 */
export const listResources = async (clients: K8sApiClients, target: KubeTarget): Promise<KubeResourceList> => {
  const entry = target.entry;
  // The whole object is requested only to sort or add columns, and never returned.
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

  // Without a Table (some aggregated APIs), only the name of each item is known.
  const printed = table?.kind === 'Table';
  const source = printed ? table.rows : table?.items?.map((item) => ({ cells: [item?.metadata?.name], object: item }));
  if (!Array.isArray(source)) {
    throw new K8sApiError('malformed', 'The Kubernetes API answered without a list of items.');
  }
  const keys = printed ? (table.columnDefinitions ?? []).map((column) => keyFor(column?.name)) : ['name'];

  // A kind reached by apiVersion has no known scope: it is namespaced if a row has a namespace.
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
      // namespace first, as -A prints it, and never overwritten by a printed column of that name.
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
 * The list as a react-query definition, so every reader shares one cache. No retry: none of the
 * failures above gets better by asking again.
 */
export const kubeResourcesQuery = (clients: K8sApiClients, target: KubeTarget) => ({
  queryKey: ['kubeResources', target.kind, target.apiVersion] as const,
  queryFn: () => listResources(clients, target),
  // Absorbs the same question asked twice in a row, while staying the cluster as it is now.
  staleTime: 5000,
  retry: false as const,
});
