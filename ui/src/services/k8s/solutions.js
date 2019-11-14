import { coreV1 } from './api';
import { listNamespaces } from './core';

const SOLUTION_CONFIGMAP_NAME = 'metalk8s-solutions';
const LABEL_K8S_COMPONENT = 'app.kubernetes.io/component';
const LABEL_K8S_PART_OF = 'app.kubernetes.io/part-of';
const LABEL_K8S_VERSION = 'app.kubernetes.io/version';
const LABEL_ENVIRONMENT_NAME = 'solutions.metalk8s.scality.com/environment';
const ANNOTATION_ENVIRONMENT_DESCRIPTION =
  'solutions.metalk8s.scality.com/environment-description';

export async function getSolutionsConfigMapForAllNamespaces() {
  try {
    return await coreV1.listConfigMapForAllNamespaces(
      null,
      `metadata.name=${SOLUTION_CONFIGMAP_NAME}`,
    );
  } catch (error) {
    return { error };
  }
}

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

// }}}
