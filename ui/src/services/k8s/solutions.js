import { V1Namespace } from '@kubernetes/client-node/dist/gen/model/models';
import { coreV1 } from './api';
import * as core from './core';

const _K8S = 'app.kubernetes.io';
const _METAL = 'solutions.metalk8s.scality.com';

const SOLUTIONS_NAMESPACE = 'metalk8s-solutions';
const SOLUTIONS_CONFIGMAP_NAME = 'metalk8s-solutions';
const LABEL_K8S_COMPONENT = `${_K8S}/component`;
const LABEL_K8S_PART_OF = `${_K8S}/part-of`;
const LABEL_ENVIRONMENT_NAME = `${_METAL}/environment`;
const ANNOTATION_ENVIRONMENT_DESCRIPTION = `${_METAL}/environment-description`;
const ANNOTATION_INGRESS_PATH = `${_METAL}/ingress-path`;
const ENVIRONMENT_CONFIGMAP_NAME = 'metalk8s-environment';

// Cluster-wide management {{{
export async function getSolutionsConfigMap() {
  try {
    return await coreV1.readNamespacedConfigMap(
      SOLUTIONS_CONFIGMAP_NAME,
      SOLUTIONS_NAMESPACE,
    );
  } catch (error) {
    return { error };
  }
}
// }}}
// Environment-scoped management {{{
export type Environment = {name: string, description: String, namespaces: V1Namespace[]};
export type Environments = {[name: string]: Environment};

export async function listEnvironments(): Promise<Environment[]> {
  const result: { body: V1NamespaceList[] } = await core.listNamespaces({
    labelSelector: LABEL_ENVIRONMENT_NAME,
  });
  if (!result.error) {
    const namespaces: V1Namespace[] = result.body.items;
    const environmentMap = namespaces.reduce((environments, ns) => {
      const name = ns.metadata?.labels?.[LABEL_ENVIRONMENT_NAME];
      const description =
        ns.metadata?.annotations?.[ANNOTATION_ENVIRONMENT_DESCRIPTION] ||
        environments[name]?.description;
      const existingNamespaces = environments[name]?.namespaces ?? [];
      return {
        ...environments,
        [name]: { name, description, namespaces: [...existingNamespaces, ns] },
      };
    }, {});
    return Object.values(environmentMap);
  }
  return result;
}

export async function createEnvironment({ name, description }) {
  const body = {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name,
      labels: { [LABEL_ENVIRONMENT_NAME]: name },
      annotations: { [ANNOTATION_ENVIRONMENT_DESCRIPTION]: description },
    },
  };
  // create namespace and configMap at the same time
  try {
    await coreV1.createNamespace(body);
    return await core.createNamespacedConfigMap(
      ENVIRONMENT_CONFIGMAP_NAME,
      name,
    );
  } catch (error) {
    return { error };
  }
}

async function getUIServices(namespace) {
  try {
    return await coreV1.listNamespacedService(
      namespace,
      null, // pretty
      null, // allowWatchBookmarks
      null, // _continue
      null, // fieldSelector
      `${LABEL_K8S_COMPONENT}=ui`, // labelSelector
    );
  } catch (error) {
    return { error };
  }
}

export async function getEnvironmentAdminUIs(environment: Environment) {
  const services = [];
  for (const namespace of environment.namespaces) {
    const result = await getUIServices(namespace);
    if (result.error) {
      return result;
    }
    services.push(...result.body.items);
  }

  return services.map((svc) => ({
    solution: svc?.metadata?.labels?.[LABEL_K8S_PART_OF],
    ingressPath: svc?.metadata?.annotations?.[ANNOTATION_INGRESS_PATH],
    service: svc,
  }));
}

export async function getEnvironmentConfigMap(environment: Environment) {
  // we may support multiple namespaces in one environment later
  const environmentConfigMaps = [];
  for (const namespace of environment.namespaces) {
    const result = await core.readNamespacedConfigMap(
      ENVIRONMENT_CONFIGMAP_NAME,
      namespace.metadata.name,
    );
    if (!result.error) {
      environmentConfigMaps.push(result?.body?.data);
    }
  }
  return environmentConfigMaps[0];
}

export async function addSolutionToEnvironment(namespace, solName, solVersion) {
  const result = await core.readNamespacedConfigMap(
    ENVIRONMENT_CONFIGMAP_NAME,
    namespace,
  );
  let patch;
  // Create the data key if it doesn't exists, otherwise we can't insert the solution field inside.
  if (result.body.data) {
    patch = [{ op: 'add', path: `/data/${solName}`, value: solVersion }];
  } else {
    patch = [{ op: 'add', path: '/data', value: { [solName]: solVersion } }];
  }

  return core.patchNamespacedConfigMap(
    ENVIRONMENT_CONFIGMAP_NAME,
    namespace,
    // use an object instead of many arguments, for easier support of
    // multiple methods (e.g. both `jsonPatch` and `mergePatch` could be
    // allowed, headers being inferred from which is used).
    { jsonPatch: patch },
  );
}

export async function deleteEnvironment(name) {
  try {
    return await coreV1.deleteNamespace(name);
  } catch (error) {
    return { error };
  }
}

// }}}
