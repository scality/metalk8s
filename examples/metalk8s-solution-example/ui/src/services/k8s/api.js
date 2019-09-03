import ApiClient from '../ApiClient';
import {
  Config,
  CoreV1Api,
  CustomObjectsApi,
  AppsV1Api,
  RbacAuthorizationV1Api
} from '@kubernetes/client-node';

import { LABEL_PART_OF } from '../../ducks/app/deployment';

let config;
let coreV1;
let customObjects;
let k8sApiClient = null;
let appsV1Api;
let rbacAuthorizationV1Api;

export function initialize(apiUrl) {
  k8sApiClient = new ApiClient({ apiUrl });
}

//Basic Auth
export function authenticate(token) {
  return k8sApiClient.get('/api/v1', null, {
    headers: {
      Authorization: 'Basic ' + token
    }
  });
}

export const updateApiServerConfig = (url, token) => {
  config = new Config(url, token, 'Basic');
  coreV1 = config.makeApiClient(CoreV1Api);
  customObjects = config.makeApiClient(CustomObjectsApi);
  appsV1Api = config.makeApiClient(AppsV1Api);
  rbacAuthorizationV1Api = config.makeApiClient(RbacAuthorizationV1Api);
};

export async function getCustomResource() {
  try {
    // We want to change this hardcoded data later
    return await customObjects.listClusterCustomObject(
      'solution.com',
      'v1alpha1',
      'examples'
    );
  } catch (error) {
    return { error };
  }
}

export async function createCustomResource(body, namespaces) {
  try {
    return await customObjects.createNamespacedCustomObject(
      'solution.com',
      'v1alpha1',
      namespaces,
      'examples',
      body
    );
  } catch (error) {
    return { error };
  }
}

export async function updateCustomResource(body, namespaces, name) {
  try {
    return await customObjects.patchNamespacedCustomObject(
      'solution.com',
      'v1alpha1',
      namespaces,
      'examples',
      name,
      body,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json'
        }
      }
    );
  } catch (error) {
    return { error };
  }
}

export async function getSolutionNamespaces() {
  try {
    return await coreV1.listNamespace(
      null,
      null,
      null,
      null,
      `${LABEL_PART_OF}=example-solution`
    );
  } catch (error) {
    return { error };
  }
}

export async function getSolutionDeployment(version) {
  try {
    return await appsV1Api.listDeploymentForAllNamespaces(
      null,
      null,
      null,
      `${LABEL_PART_OF}=example-solution`
    );
  } catch (error) {
    return { error };
  }
}

export async function createNamespacedDeployment(namespaces, body) {
  try {
    return await appsV1Api.createNamespacedDeployment(namespaces, body);
  } catch (error) {
    return { error };
  }
}

export async function createNamespacedServiceAccount(namespaces, body) {
  try {
    return await coreV1.createNamespacedServiceAccount(namespaces, body);
  } catch (error) {
    return { error };
  }
}

export async function createNamespacedRole(namespaces, body) {
  try {
    return await rbacAuthorizationV1Api.createNamespacedRole(namespaces, body);
  } catch (error) {
    return { error };
  }
}

export async function createNamespacedRoleBinding(namespaces, body) {
  try {
    return await rbacAuthorizationV1Api.createNamespacedRoleBinding(
      namespaces,
      body
    );
  } catch (error) {
    return { error };
  }
}

export async function updateDeployment(body, namespaces, name) {
  try {
    return await appsV1Api.patchNamespacedDeployment(
      name,
      namespaces,
      body,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json'
        }
      }
    );
  } catch (error) {
    return { error };
  }
}
