import { coreV1, customObjects } from './api';

const SOLUTION_CONFIGMAP_NAME = 'metalk8s-solutions';
const APP_K8S_COMPONENT_LABEL = 'app.kubernetes.io/component';

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

export async function getUIServiceForAllNamespaces() {
  try {
    return await coreV1.listServiceForAllNamespaces(
      null,
      null,
      null,
      `${APP_K8S_COMPONENT_LABEL}=ui`,
    );
  } catch (error) {
    return { error };
  }
}

export async function getEnvironments() {
  try {
    return await customObjects.listClusterCustomObject(
      'solutions.metalk8s.scality.com',
      'v1alpha1',
      'environments',
    );
  } catch (error) {
    return { error };
  }
}

export async function createEnvironment(body) {
  try {
    return await customObjects.createClusterCustomObject(
      'solutions.metalk8s.scality.com',
      'v1alpha1',
      'environments',
      body,
    );
  } catch (error) {
    return { error };
  }
}
