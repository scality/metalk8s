// What a model is handed, as opposed to what the cluster returned.
//
// This is policy, not Kubernetes: it lives here rather than in services/k8s because the service has
// other callers. A panel rendering a pod for the administrator whose cluster it is may want the
// environment values this holds back, and it should not have to argue with the service about it.
//
// Two reasons something is held back. Credentials: excluding Secret is necessary and not sufficient,
// because a pod spec and a ConfigMap carry them just as readily. And bulk: a single object normally
// fits whole, but some arrive outsized on their own, and a model's context is not free.

/** Whatever the API returned. Only the keys this file touches are named. */
type KubeObject = {
  metadata?: Record<string, unknown>;
  spec?: unknown;
  status?: unknown;
} & Record<string, unknown>;

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
const withoutConfigMapValues = (kind: string, object: KubeObject, omitted: string[]): KubeObject => {
  if (kind !== 'configmaps') return object;

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
 * The object as a model should see it, and the list of what that cost.
 *
 * `omitted` is never silent: a field absent without explanation reads as a field the cluster does
 * not have, and "this variable has no value" is a different statement from "we did not show it".
 */
export const objectForModel = (kind: string, object: KubeObject): { resource: KubeObject; omitted: string[] } => {
  const omitted: string[] = [];

  const dropped = { any: false };
  const redacted = redactEnv(object, dropped) as KubeObject;
  if (dropped.any) omitted.push('env values (names kept)');

  return {
    resource: sizeDown(withoutConfigMapValues(kind, withoutLastApplied(redacted, omitted), omitted), omitted),
    omitted,
  };
};
