import { coreV1, appsV1 } from './api';
import { listNamespaces } from './core';

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
export async function listEnvironments() {
  const result = await listNamespaces({
    labelSelector: LABEL_ENVIRONMENT_NAME,
  });
  if (!result.error) {
    const namespaces = result?.body?.items;
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

  try {
    return await coreV1.createNamespace(body);
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

export async function getEnvironmentAdminUIs(environment) {
  const services = [];
  for (const namespace of environment.namespaces) {
    const result = await getUIServices(namespace);
    if (result.error) {
      return result;
    }
    services.push(...result.body.items);
  }

  return services.map(svc => ({
    solution: svc?.metadata?.labels?.[LABEL_K8S_PART_OF],
    ingressPath: svc?.metadata?.annotations?.[ANNOTATION_INGRESS_PATH],
    service: svc,
  }));
}

export async function getNamespacedConfigmap(environment) {
  try {
    return await coreV1.readNamespacedConfigMap(
      ENVIRONMENT_CONFIGMAP_NAME,
      environment,
    );
  } catch (error) {
    return { error };
  }
}

export async function createNamespacedConfigMap(namespace) {
  const body = {
    metadata: {
      name: ENVIRONMENT_CONFIGMAP_NAME,
    },
  };
  try {
    return await coreV1.createNamespacedConfigMap(namespace, body);
  } catch (error) {
    return { error };
  }
}

export async function patchNamespacedConfigMap(namespace, data) {
  const body = {
    data: { ...data },
  };
  try {
    return await coreV1.patchNamespacedConfigMap(
      ENVIRONMENT_CONFIGMAP_NAME,
      namespace,
      body,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json',
        },
      },
    );
  } catch (error) {
    return { error };
  }
}

export async function getNamespacedDeployment(name, namespace) {
  try {
    return await appsV1.readNamespacedDeployment(name, namespace);
  } catch (error) {
    return { error };
  }
}
// }}}
