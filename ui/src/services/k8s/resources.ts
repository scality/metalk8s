// Listing one kind of Kubernetes resource, projected down to the few fields that say whether it is
// healthy — the read behind the `listKubeResources` MCP tool, and usable by anything else that
// wants the same summary.
//
// It deliberately does NOT use `handleUnAuthorizedError` from services/errorhandler: that helper
// collapses 401 and 403 into a single AuthError, and returns `{ error }` for everything else rather
// than throwing. A caller here needs those apart — "your session expired" and "your RBAC forbids
// this" lead to different places, and so does "there is no such kind" — so the status codes are
// mapped here instead.

import type {
  V1beta1CronJob,
  V1ConfigMap,
  V1DaemonSet,
  V1Deployment,
  V1Event,
  V1Job,
  V1Namespace,
  V1Node,
  V1PersistentVolume,
  V1PersistentVolumeClaim,
  V1Pod,
  V1Service,
  V1StatefulSet,
} from '@kubernetes/client-node';
import { ROLE_PREFIX } from '../../constants';
import type { K8sApiClients } from './api';

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

type KindEntry = {
  apiVersion: string;
  namespaced: boolean;
  list: (clients: K8sApiClients) => Promise<ListResponse>;
  /**
   * How to order the items before the list is cut, for a kind where time decides which rows matter.
   * The API server returns items in etcd key order — namespace, then name — so a plain cut at
   * MAX_ITEMS drops whole namespaces that sort late, however recent they are.
   */
  newestFirst?: (item: never) => number;
  /**
   * Typed with the client's own V1* type at each call site, so a projection that drifts from the
   * real object stops compiling. Where a projection and the real type disagree, the real type wins.
   */
  project: (item: never) => KubeResourceItem;
};

/** metadata.creationTimestamp arrives deserialised to a Date; the wire shape is ISO 8601. */
const iso = (value?: Date | string): string | undefined => (value instanceof Date ? value.toISOString() : value);

/**
 * When an event was last seen, resolved the way `kubectl get events` resolves it.
 *
 * An event written through events.k8s.io/v1 sets neither `lastTimestamp` nor `count` in this core
 * v1 view — it carries `series` or a bare `eventTime` instead. On 1.34 that includes the
 * scheduler's FailedScheduling, which is the whole answer for a Pending pod.
 */
const eventLastSeen = (event: V1Event): Date | string | undefined =>
  event.lastTimestamp ?? event.series?.lastObservedTime ?? event.eventTime ?? event.metadata?.creationTimestamp;

const millis = (value?: Date | string): number => {
  const time = value === undefined ? Number.NaN : new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * The reason an init container is holding the pod up, as `Init:<reason>`.
 *
 * Init containers run in order, and until they finish the main container reports `PodInitializing`.
 * Without this, a pod whose init container is crash-looping reads as PodInitializing or Pending and
 * the real fault is invisible — so they are read first, and only the one currently blocking counts.
 *
 * A running one is skipped rather than reported, as kubectl skips it. A sidecar — an init container
 * with restartPolicy Always — runs for the pod's whole life and would otherwise hide every init
 * container listed after it. For a plain init container the answer is unchanged: the ones after it
 * are waiting with `PodInitializing`, which is not a fault either.
 */
const initStatus = (pod: V1Pod): string | undefined => {
  for (const container of pod.status?.initContainerStatuses ?? []) {
    const terminated = container.state?.terminated;
    if (terminated?.exitCode === 0 || container.state?.running) continue;

    const reason = container.state?.waiting?.reason ?? terminated?.reason ?? (terminated ? 'Error' : undefined);
    // PodInitializing on an init container means it has not started yet, which is not a fault.
    return reason && reason !== 'PodInitializing' ? `Init:${reason}` : undefined;
  }
  return undefined;
};

/**
 * A pod's phase is frequently not the interesting word: a crash-looping pod sits in phase Running
 * or Pending with the reason on the container. kubectl surfaces the container reason for the same
 * reason, so `status` here is the most specific thing available.
 */
const podStatus = (pod: V1Pod): string => {
  const init = initStatus(pod);
  if (init) return init;

  const containers = pod.status?.containerStatuses ?? [];
  const waiting = containers.find((cs) => cs.state?.waiting?.reason)?.state?.waiting?.reason;
  const terminated = containers.find((cs) => cs.state?.terminated?.reason)?.state?.terminated?.reason;
  // status.reason before the phase: an evicted pod is phase Failed with reason Evicted, and so is a
  // lost or shut-down one. kubectl prefers the reason for the same reason — "Failed" says nothing.
  return waiting ?? terminated ?? pod.status?.reason ?? pod.status?.phase ?? 'Unknown';
};

const nodeStatus = (node: V1Node): string => {
  const ready = node.status?.conditions?.find((condition) => condition.type === 'Ready');
  if (ready?.status === 'True') return 'Ready';
  if (ready?.status === 'False') return 'NotReady';
  return 'Unknown';
};

/**
 * The kinds reachable by name, each mapped to the generated client method that lists it across
 * every namespace.
 *
 * Allowlisted rather than discovered: predictable, and it makes excluding Secret a wall rather than
 * a filter. The cost is a list to maintain — which is why `apiVersion` exists, so any kind in an
 * API group stays reachable without shipping a release.
 *
 * Fields are per-kind rather than uniform. A pod has `ready` and `restarts`; a PVC has `capacity`
 * and `boundTo`. Forcing one shape would mean inventing empty columns.
 */
export const KINDS: Record<string, KindEntry> = {
  pods: {
    apiVersion: 'v1',
    namespaced: true,
    list: (c) => c.coreV1.listPodForAllNamespaces(),
    project: (pod: V1Pod) => ({
      name: pod.metadata?.name,
      namespace: pod.metadata?.namespace,
      status: podStatus(pod),
      ready: `${(pod.status?.containerStatuses ?? []).filter((cs) => cs.ready).length}/${
        pod.spec?.containers?.length ?? 0
      }`,
      restarts: (pod.status?.containerStatuses ?? []).reduce((total, cs) => total + (cs.restartCount ?? 0), 0),
      node: pod.spec?.nodeName,
      createdAt: iso(pod.metadata?.creationTimestamp),
    }),
  },
  nodes: {
    apiVersion: 'v1',
    namespaced: false,
    list: (c) => c.coreV1.listNode(),
    project: (node: V1Node) => ({
      name: node.metadata?.name,
      status: nodeStatus(node),
      // A cordoned node is Ready and still takes no new pods — kubectl says Ready,SchedulingDisabled.
      // Kept as its own field rather than folded into status, so nothing has to parse a pair.
      unschedulable: node.spec?.unschedulable ?? false,
      // The same derivation the nodes page runs (ducks/app/nodes, hooks/nodes), off the same
      // constant: a role is the second half of a `node-role.kubernetes.io/<role>` label.
      roles: Object.keys(node.metadata?.labels ?? {})
        .filter((label) => label.startsWith(`${ROLE_PREFIX}/`))
        .map((label) => label.slice(ROLE_PREFIX.length + 1)),
      kubeletVersion: node.status?.nodeInfo?.kubeletVersion,
      createdAt: iso(node.metadata?.creationTimestamp),
    }),
  },
  deployments: {
    apiVersion: 'apps/v1',
    namespaced: true,
    list: (c) => c.appsV1.listDeploymentForAllNamespaces(),
    project: (deployment: V1Deployment) => ({
      name: deployment.metadata?.name,
      namespace: deployment.metadata?.namespace,
      ready: `${deployment.status?.readyReplicas ?? 0}/${deployment.spec?.replicas ?? 0}`,
      upToDate: deployment.status?.updatedReplicas ?? 0,
      available: deployment.status?.availableReplicas ?? 0,
      createdAt: iso(deployment.metadata?.creationTimestamp),
    }),
  },
  statefulsets: {
    apiVersion: 'apps/v1',
    namespaced: true,
    list: (c) => c.appsV1.listStatefulSetForAllNamespaces(),
    project: (statefulSet: V1StatefulSet) => ({
      name: statefulSet.metadata?.name,
      namespace: statefulSet.metadata?.namespace,
      ready: `${statefulSet.status?.readyReplicas ?? 0}/${statefulSet.spec?.replicas ?? 0}`,
      currentRevision: statefulSet.status?.currentRevision,
      createdAt: iso(statefulSet.metadata?.creationTimestamp),
    }),
  },
  daemonsets: {
    apiVersion: 'apps/v1',
    namespaced: true,
    list: (c) => c.appsV1.listDaemonSetForAllNamespaces(),
    project: (daemonSet: V1DaemonSet) => ({
      name: daemonSet.metadata?.name,
      namespace: daemonSet.metadata?.namespace,
      ready: `${daemonSet.status?.numberReady ?? 0}/${daemonSet.status?.desiredNumberScheduled ?? 0}`,
      available: daemonSet.status?.numberAvailable ?? 0,
      misscheduled: daemonSet.status?.numberMisscheduled ?? 0,
      createdAt: iso(daemonSet.metadata?.creationTimestamp),
    }),
  },
  jobs: {
    apiVersion: 'batch/v1',
    namespaced: true,
    list: (c) => c.batchV1.listJobForAllNamespaces(),
    project: (job: V1Job) => ({
      name: job.metadata?.name,
      namespace: job.metadata?.namespace,
      completions: `${job.status?.succeeded ?? 0}/${job.spec?.completions ?? 1}`,
      active: job.status?.active ?? 0,
      failed: job.status?.failed ?? 0,
      createdAt: iso(job.metadata?.creationTimestamp),
    }),
  },
  // batch/v1, through CustomObjectsApi. This client is generated from the v1.13 OpenAPI, where
  // CronJob is still beta, so its only CronJob method addresses /apis/batch/v1beta1/cronjobs — a
  // path the API server has not served since 1.25, and this ships Kubernetes 1.34. V1beta1CronJob
  // still types the projection: the fields read here are the same in both versions.
  cronjobs: {
    apiVersion: 'batch/v1',
    namespaced: true,
    list: (c) => c.customObjects.listClusterCustomObject('batch', 'v1', 'cronjobs'),
    project: (cronJob: V1beta1CronJob) => ({
      name: cronJob.metadata?.name,
      namespace: cronJob.metadata?.namespace,
      schedule: cronJob.spec?.schedule,
      suspended: cronJob.spec?.suspend ?? false,
      active: cronJob.status?.active?.length ?? 0,
      lastScheduleTime: iso(cronJob.status?.lastScheduleTime),
      createdAt: iso(cronJob.metadata?.creationTimestamp),
    }),
  },
  services: {
    apiVersion: 'v1',
    namespaced: true,
    list: (c) => c.coreV1.listServiceForAllNamespaces(),
    project: (service: V1Service) => ({
      name: service.metadata?.name,
      namespace: service.metadata?.namespace,
      type: service.spec?.type,
      clusterIP: service.spec?.clusterIP,
      ports: (service.spec?.ports ?? []).map((port) => `${port.port}/${port.protocol ?? 'TCP'}`),
      createdAt: iso(service.metadata?.creationTimestamp),
    }),
  },
  pvc: {
    apiVersion: 'v1',
    namespaced: true,
    list: (c) => c.coreV1.listPersistentVolumeClaimForAllNamespaces(),
    project: (claim: V1PersistentVolumeClaim) => ({
      name: claim.metadata?.name,
      namespace: claim.metadata?.namespace,
      status: claim.status?.phase,
      capacity: claim.status?.capacity?.storage,
      boundTo: claim.spec?.volumeName,
      storageClass: claim.spec?.storageClassName,
      createdAt: iso(claim.metadata?.creationTimestamp),
    }),
  },
  pv: {
    apiVersion: 'v1',
    namespaced: false,
    list: (c) => c.coreV1.listPersistentVolume(),
    project: (volume: V1PersistentVolume) => ({
      name: volume.metadata?.name,
      status: volume.status?.phase,
      capacity: volume.spec?.capacity?.storage,
      claim: volume.spec?.claimRef ? `${volume.spec.claimRef.namespace}/${volume.spec.claimRef.name}` : undefined,
      storageClass: volume.spec?.storageClassName,
      reclaimPolicy: volume.spec?.persistentVolumeReclaimPolicy,
      createdAt: iso(volume.metadata?.creationTimestamp),
    }),
  },
  events: {
    apiVersion: 'v1',
    namespaced: true,
    list: (c) => c.coreV1.listEventForAllNamespaces(),
    newestFirst: (event: V1Event) => millis(eventLastSeen(event)),
    project: (event: V1Event) => ({
      name: event.metadata?.name,
      namespace: event.metadata?.namespace,
      type: event.type,
      reason: event.reason,
      object: `${event.involvedObject?.kind}/${event.involvedObject?.name}`,
      message: event.message,
      count: event.count ?? event.series?.count,
      lastSeen: iso(eventLastSeen(event)),
    }),
  },
  // Key NAMES only. A ConfigMap can hold a connection string, and excluding Secret does not make
  // ConfigMap values safe to hand to a model.
  configmaps: {
    apiVersion: 'v1',
    namespaced: true,
    list: (c) => c.coreV1.listConfigMapForAllNamespaces(),
    project: (configMap: V1ConfigMap) => ({
      name: configMap.metadata?.name,
      namespace: configMap.metadata?.namespace,
      keys: Object.keys(configMap.data ?? {}),
      createdAt: iso(configMap.metadata?.creationTimestamp),
    }),
  },
  namespaces: {
    apiVersion: 'v1',
    namespaced: false,
    list: (c) => c.coreV1.listNamespace(),
    project: (namespace: V1Namespace) => ({
      name: namespace.metadata?.name,
      status: namespace.status?.phase,
      createdAt: iso(namespace.metadata?.creationTimestamp),
    }),
  },
};

/** What a caller is shown when it names a kind this does not know. */
export const ALLOWED_KINDS = Object.keys(KINDS);

/**
 * A kind reached by apiVersion has no generated type here, so its projection is the handful of
 * fields every object carries. `phase` only when the kind uses one.
 */
type CustomObject = {
  metadata?: { name?: string; namespace?: string; creationTimestamp?: Date | string };
  status?: {
    phase?: unknown;
    conditions?: { type?: string; status?: string; reason?: string }[];
  };
};

const projectCustomObject = (item: CustomObject): KubeResourceItem => ({
  name: item?.metadata?.name,
  namespace: item?.metadata?.namespace,
  ...(typeof item?.status?.phase === 'string' ? { status: item.status.phase } : {}),
  // Conditions, because many kinds report health there rather than in a phase — the metalk8s Volume
  // is one. Without them such a kind lists as a name and a date, which answers "what exists" and
  // nothing about whether any of it is working.
  ...(Array.isArray(item?.status?.conditions)
    ? {
        conditions: item.status.conditions.map((condition) => ({
          type: condition?.type,
          status: condition?.status,
          ...(condition?.reason ? { reason: condition.reason } : {}),
        })),
      }
    : {}),
  createdAt: iso(item?.metadata?.creationTimestamp),
});

/** group/version, as CustomObjectsApi wants them: two arguments, never a path fragment. */
const parseApiVersion = (apiVersion: string): { group: string; version: string } => {
  const parts = apiVersion.split('/');
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
  const normalized = (kind ?? '').trim().toLowerCase();
  const entry = KINDS[normalized];

  if (!entry && !apiVersion) {
    throw new K8sApiError(
      'not_found',
      `"${kind}" is not one of the kinds this tool lists by name. If it lives in an API group, call again with its apiVersion and it will be fetched — that works for built-in kinds outside the list (e.g. "networking.k8s.io/v1" for ingresses) as much as for custom ones.`,
    );
  }

  // The allowlist answers when it can: it is the same resource, through a typed client, with a
  // projection worth reading. An apiVersion naming something ELSE routes to custom objects.
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
 * List one kind, and project it.
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

  const project = target.entry ? target.entry.project : projectCustomObject;

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
    items: kept.map((item) => project(item as never)),
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
