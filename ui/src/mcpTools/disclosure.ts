// What a tool discloses of an object, as against what the cluster returned.
//
// This is policy, not Kubernetes: it lives here rather than in services/k8s because the service has
// other callers. A panel rendering a pod for the administrator whose cluster it is may want the
// values withheld here, and it should not have to argue with the service about it.
//
// Two reasons to withhold. Credentials: a Secret's values, a ConfigMap's, and any field or env
// variable named like a credential, whatever its kind. And
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

const withoutEnvCredentials = (container: unknown, hidden: { any: boolean }): unknown => {
  const env = (container as { env?: { name?: string; value?: string }[] })?.env;
  if (!Array.isArray(env)) return container;

  return {
    ...(container as object),
    env: env.map((variable) => {
      if (
        variable?.value === undefined ||
        variable.value === HIDDEN ||
        typeof variable.name !== 'string' ||
        !isCredentialName(variable.name)
      ) {
        return variable;
      }
      hidden.any = true;
      return { ...variable, value: HIDDEN };
    }),
  };
};

/**
 * Environment values named like a credential, hidden, their names kept — wherever in the object the
 * containers are. The others stay: a port, a host or a feature flag is what a diagnosis reads.
 *
 * It walks rather than reaching for a path, because every kind puts its pod template somewhere
 * different: a Pod at `spec.containers`, a ReplicaSet or Job at `spec.template.spec.containers`, a
 * CronJob at `spec.jobTemplate.spec.template.spec.containers`, and an operator's own resource
 * wherever its author chose. Reaching for a path covers the kinds someone wrote down, and a kind
 * reached by apiVersion is by definition one nobody did.
 *
 * A Secret's values are not the only credentials: a pod spec holds a password just as readily, but
 * as `{ name, value }`, so the name matched against the credential words is the variable's. Any
 * `valueFrom` reference survives: it says where the variable comes from, not what it is.
 */
const withoutEnvironmentCredentials = (value: unknown, hidden: { any: boolean }): unknown => {
  if (Array.isArray(value)) return value.map((nested) => withoutEnvironmentCredentials(nested, hidden));
  // A Date survives only by being returned as it is: entries() on one gives nothing back.
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) =>
      CONTAINER_KEYS.has(key) && Array.isArray(nested)
        ? [key, nested.map((container) => withoutEnvCredentials(container, hidden))]
        : [key, withoutEnvironmentCredentials(nested, hidden)],
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
 * The words a credential's name is made of, matched in any field or env variable name outside
 * `metadata`, on any kind: `adminPassword`, `PGPASSWORD`, `secretAccessKey`, `refreshToken`,
 * `client_secret`. Names are split on case and separators; the first four words are also matched
 * inside a word, for names written as one (`PGPASSWORD`).
 *
 * Gathered from the kinds deployed on an ARTESCA cluster and from Dex and Keycloak. A field holding a
 * Secret's NAME under such a name is hidden too, which is the cost of a rule that does not know every
 * kind.
 */
const CREDENTIAL_WORDS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'pass',
  'pwd',
  'pw',
  'credential',
  'credentials',
  'hmac',
  // Two words that make a credential only together: `accessKey`, `ACCESS_KEY`, `user_code`.
  'accesskey',
  'secretkey',
  'privatekey',
  'apikey',
  'hmackey',
  'devicecode',
  'usercode',
  'connectordata',
]);
const CREDENTIAL_WORD_PARTS = ['password', 'passwd', 'secret', 'token'];

/** Too common a word to match inside a longer name (`pod-template-hash`), so only on its own. */
const CREDENTIAL_NAMES = new Set(['hash']);

/**
 * A last word that makes the name a reference or a setting, not a credential: `secretName`,
 * `secretKeyRef`, `bearerTokenFile`, `passwordSecretRef`. `key` is one only after a word it does not
 * make a credential with: `passwordKey` names a key in a Secret, `secretKey` is the key itself.
 */
const REFERENCE_WORDS = new Set(['name', 'names', 'ref', 'file', 'path', 'dir', 'namespace', 'selector', 'key']);

const isCredentialName = (name: string): boolean => {
  if (CREDENTIAL_NAMES.has(name.toLowerCase())) return true;
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const joined = (i: number) => (i > 0 ? words[i - 1] + words[i] : '');
  const last = words.length - 1;
  if (REFERENCE_WORDS.has(words[last])) return words[last] === 'key' && CREDENTIAL_WORDS.has(joined(last));
  return words.some(
    (word, i) =>
      CREDENTIAL_WORDS.has(word) ||
      CREDENTIAL_WORDS.has(joined(i)) ||
      CREDENTIAL_WORD_PARTS.some((part) => word.includes(part)),
  );
};

/** Credential fields whose value is an object or a list of objects: hidden whole, whatever it holds. */
const CREDENTIAL_OBJECTS = new Set(['mfaSecrets', 'webauthnCredentials'].map((name) => name.toLowerCase()));

/** The private parts of a JSON Web Key; `kty`, `kid`, `n` and `e` are public. */
const JWK_PRIVATE_FIELDS = new Set(['d', 'p', 'q', 'dp', 'dq', 'qi', 'k']);

const isText = (value: unknown) =>
  typeof value === 'string' || (Array.isArray(value) && value.every((item) => typeof item === 'string'));

/**
 * Every credential in `value` hidden, everything else kept, any `metadata` (its labels and
 * annotations hold hashes, never credentials) left alone. Besides the names above, two shapes:
 * the private parts of a JSON Web Key (any object with a `kty`), and the `value` of a
 * `credentials` list item (a Keycloak user's password).
 */
const withoutCredentialFields = (value: unknown, hidden: { any: boolean }, inCredentials = false): unknown => {
  if (Array.isArray(value)) return value.map((item) => withoutCredentialFields(item, hidden, inCredentials));
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;

  const isKey = 'kty' in (value as Record<string, unknown>);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      if (key === 'metadata') return [key, nested];
      const name = key.toLowerCase();
      const isCredential =
        CREDENTIAL_OBJECTS.has(name) ||
        (isText(nested) && (isCredentialName(key) || (inCredentials && name === 'value'))) ||
        (isKey && JWK_PRIVATE_FIELDS.has(key));
      // Already hidden (a Secret's data): nothing left to withhold, and nothing to report twice.
      if (isCredential && nested !== undefined && nested !== HIDDEN) {
        hidden.any = true;
        return [key, HIDDEN];
      }
      return [key, withoutCredentialFields(nested, hidden, name === 'credentials')];
    }),
  );
};

/**
 * The object with its credentials hidden. Dex's `config` — a connector's settings, LDAP password
 * included — is too common a name for the list, so it is matched on Dex's group only.
 */
const withoutCredentials = (object: KubeObject, omitted: string[]): KubeObject => {
  const hidden = { any: false };
  const isDex = String(object.apiVersion ?? '').startsWith('dex.coreos.com/');
  const body = isDex && object.config !== undefined ? { ...object, config: HIDDEN } : object;
  if (body !== object) hidden.any = true;
  const kept = withoutCredentialFields(body, hidden) as KubeObject;

  if (!hidden.any) return object;
  omitted.push('credentials (fields kept)');
  return kept;
};

/**
 * The annotation `kubectl apply` writes: a verbatim JSON copy of the applied spec, credentials and
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

  const hidden = { any: false };
  let resource = withoutEnvironmentCredentials(object, hidden) as KubeObject;
  if (hidden.any) omitted.push('credential env values (names kept)');

  resource = withoutLastApplied(resource, omitted);
  resource = withoutConfigMapValues(kind, resource, omitted);
  resource = withoutSecretValues(kind, resource, omitted);
  resource = withoutCredentials(resource, omitted);
  resource = sizeDown(resource, omitted);

  return { resource, omitted };
};
