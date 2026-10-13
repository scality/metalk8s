// What a tool discloses of what the cluster returned.
//
// This is policy, not Kubernetes: it lives here rather than in services/k8s because the service has
// other callers. A panel rendering a pod for the administrator whose cluster it is may want the
// environment values withheld here, and it should not have to argue with the service about it.

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
 * different: a Pod at `spec.containers`, a ReplicaSet or Job at `spec.template.spec.containers`, a
 * CronJob at `spec.jobTemplate.spec.template.spec.containers`, and an operator's own resource
 * wherever its author chose. Reaching for a path covers the kinds someone wrote down, and a kind
 * reached by apiVersion is by definition one nobody did.
 *
 * Excluding Secret is necessary and not sufficient: a pod spec holds a password just as readily.
 * The names and any `valueFrom` reference survive, which is what a diagnosis reads — that a variable
 * is set, and where it comes from.
 */
export const withoutEnvironmentValues = (value: unknown, dropped: { any: boolean }): unknown => {
  if (Array.isArray(value)) return value.map((nested) => withoutEnvironmentValues(nested, dropped));
  // A Date survives only by being returned as it is: entries() on one gives nothing back.
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) =>
      CONTAINER_KEYS.has(key) && Array.isArray(nested)
        ? [key, nested.map((container) => withoutEnvValues(container, dropped))]
        : [key, withoutEnvironmentValues(nested, dropped)],
    ),
  );
};

/**
 * What may be disclosed of a list, and the list of what that cost.
 *
 * `omitted` is never silent: a field absent without explanation reads as a field the cluster does
 * not have, and "this variable has no value" is a different statement from "we did not show it".
 */
export const discloseList = <T>(items: T[]): { items: T[]; omitted: string[] } => {
  const dropped = { any: false };
  const disclosed = items.map((item) => withoutEnvironmentValues(item, dropped) as T);

  return { items: disclosed, omitted: dropped.any ? ['env values (names kept)'] : [] };
};
