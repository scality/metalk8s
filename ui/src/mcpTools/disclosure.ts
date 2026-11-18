// What a tool discloses of an object, as against what the cluster returned.
//
// This is policy, not Kubernetes: it lives here rather than in services/k8s because the service has
// other callers. A panel rendering a pod for the administrator whose cluster it is may want the
// environment values withheld here, and it should not have to argue with the service about it.
//
// Two reasons to withhold. Credentials: a Secret's values, the same values where a pod spec or a
// ConfigMap carries them, and those Dex and a Keycloak realm import keep in their own fields. And
// bulk: a single object normally fits whole, but some arrive outsized, and a model's context is not
// free.

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
 * different: a Pod at `spec.containers`, a ReplicaSet or Job at `spec.template.spec.containers`, a
 * CronJob at `spec.jobTemplate.spec.template.spec.containers`, and an operator's own resource
 * wherever its author chose. Reaching for a path covers the kinds someone wrote down, and a kind
 * reached by apiVersion is by definition one nobody did.
 *
 * A Secret's values are not the only credentials: a pod spec holds a password just as readily.
 * The names and any `valueFrom` reference survive, which is what a diagnosis reads — that a variable
 * is set, and where it comes from.
 */
const withoutEnvironmentValues = (value: unknown, dropped: { any: boolean }): unknown => {
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

/** What a withheld value is replaced with: the key stays, so the model knows the value exists. */
const HIDDEN = 'hidden';

/**
 * A Secret with each key kept and its value hidden. `stringData` is write-only and never comes back
 * from the API, so it is dropped if present.
 */
const withoutSecretValues = (kind: string, object: KubeObject, omitted: string[]): KubeObject => {
  if (kind !== 'secrets') return object;

  const { data, stringData, ...rest } = object as KubeObject & {
    data?: Record<string, string>;
    stringData?: Record<string, string>;
  };
  if (!data && !stringData) return object;

  omitted.push('Secret values (keys kept)');
  return { ...rest, data: Object.fromEntries(Object.keys(data ?? {}).map((key) => [key, HIDDEN])) };
};

/**
 * Dex (`storage.type: kubernetes`) keeps its credentials in its own objects' fields, under these
 * names: client secrets, password hashes, connector configs, tokens and MFA material.
 */
const DEX_CREDENTIAL_FIELDS = new Set([
  'secret',
  'hash',
  'config',
  'token',
  'obsoleteToken',
  'client_secret',
  'hmac_key',
  'mfaSecrets',
  'webauthnCredentials',
  'connectorData',
  'device_code',
  'user_code',
]);

/** The private parts of a JSON Web Key; `kty`, `kid`, `n` and `e` are public. */
const JWK_PRIVATE_FIELDS = new Set(['d', 'p', 'q', 'dp', 'dq', 'qi', 'k']);

/** A JWK's private parts hidden, wherever in the object a key (anything with a `kty`) sits. */
const withoutPrivateKeys = (value: unknown, hidden: { any: boolean }): unknown => {
  if (Array.isArray(value)) return value.map((nested) => withoutPrivateKeys(nested, hidden));
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;

  const isKey = 'kty' in (value as Record<string, unknown>);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      if (isKey && JWK_PRIVATE_FIELDS.has(key)) {
        hidden.any = true;
        return [key, HIDDEN];
      }
      return [key, withoutPrivateKeys(nested, hidden)];
    }),
  );
};

/** A Dex object with its credential fields and private keys hidden, everything else kept. */
const withoutDexCredentials = (object: KubeObject, omitted: string[]): KubeObject => {
  if (!String(object.apiVersion ?? '').startsWith('dex.coreos.com/')) return object;

  const hidden = { any: false };
  const fields = Object.fromEntries(
    Object.entries(object).map(([key, value]) => {
      if (key !== 'metadata' && DEX_CREDENTIAL_FIELDS.has(key)) {
        hidden.any = true;
        return [key, HIDDEN];
      }
      return [key, key === 'metadata' ? value : withoutPrivateKeys(value, hidden)];
    }),
  ) as KubeObject;

  if (!hidden.any) return object;
  omitted.push('Dex credentials (fields kept)');
  return fields;
};

/**
 * Where a Keycloak realm, as a KeycloakRealmImport carries it in `spec.realm`, holds credentials.
 * `*` is any item of a list or any value of a map.
 */
const KEYCLOAK_REALM_CREDENTIALS = [
  ['clients', '*', 'secret'],
  ['users', '*', 'credentials', '*', 'value'],
  ['users', '*', 'credentials', '*', 'secretData'],
  ['identityProviders', '*', 'config', 'clientSecret'],
  ['smtpServer', 'password'],
  ['components', '*', '*', 'config', 'bindCredential'],
  ['components', '*', '*', 'config', 'privateKey'],
  ['components', '*', '*', 'config', 'secret'],
  ['components', '*', '*', 'config', 'keystorePassword'],
  ['components', '*', '*', 'config', 'keyPassword'],
];

/** The value at `path` replaced by HIDDEN, wherever it exists; the rest of `value` untouched. */
const hideAt = (value: unknown, path: string[], hidden: { any: boolean }): unknown => {
  if (path.length === 0) {
    if (value === undefined) return value;
    hidden.any = true;
    return HIDDEN;
  }
  if (value === null || typeof value !== 'object') return value;

  const [step, ...rest] = path;
  if (Array.isArray(value)) return step === '*' ? value.map((item) => hideAt(item, rest, hidden)) : value;

  const entries = Object.entries(value as Record<string, unknown>);
  return Object.fromEntries(
    entries.map(([key, nested]) =>
      step === '*' || key === step ? [key, hideAt(nested, rest, hidden)] : [key, nested],
    ),
  );
};

/** A KeycloakRealmImport with its realm's credentials hidden, everything else kept. */
const withoutKeycloakCredentials = (object: KubeObject, omitted: string[]): KubeObject => {
  if (!String(object.apiVersion ?? '').startsWith('k8s.keycloak.org/') || object.kind !== 'KeycloakRealmImport') {
    return object;
  }
  const spec = object.spec as { realm?: unknown } | undefined;
  if (!spec?.realm) return object;

  const hidden = { any: false };
  const realm = KEYCLOAK_REALM_CREDENTIALS.reduce((current, path) => hideAt(current, path, hidden), spec.realm);

  if (!hidden.any) return object;
  omitted.push('Keycloak credentials (fields kept)');
  return { ...object, spec: { ...spec, realm } };
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
 * What may be disclosed of this object, and the list of what that cost.
 *
 * `omitted` is never silent: a field absent without explanation reads as a field the cluster does
 * not have, and "this variable has no value" is a different statement from "we did not show it".
 */
export const disclose = (kind: string, object: KubeObject): { resource: KubeObject; omitted: string[] } => {
  const omitted: string[] = [];

  const dropped = { any: false };
  const redacted = withoutEnvironmentValues(object, dropped) as KubeObject;
  if (dropped.any) omitted.push('env values (names kept)');

  return {
    resource: sizeDown(
      withoutKeycloakCredentials(
        withoutDexCredentials(
          withoutSecretValues(
            kind,
            withoutConfigMapValues(kind, withoutLastApplied(redacted, omitted), omitted),
            omitted,
          ),
          omitted,
        ),
        omitted,
      ),
      omitted,
    ),
    omitted,
  };
};
