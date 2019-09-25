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

export async function getStack() {
  try {
    return await customObjects.listClusterCustomObject(
      'solutions.metalk8s.scality.com',
      'v1alpha1',
      'stacks'
    );
  } catch (error) {
    return { error };
  }
}

export async function updateStack(body, name) {
  try {
    return await customObjects.patchClusterCustomObject(
      'solutions.metalk8s.scality.com',
      'v1alpha1',
      'stacks',
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

export async function getClockServer(namespaces) {
  try {
    return await customObjects.listNamespacedCustomObject(
      'example-solution.metalk8s.scality.com',
      'v1alpha1',
      namespaces,
      'clockservers'
    );
  } catch (error) {
    return { error };
  }
}

export async function getVersionServer(namespaces) {
  try {
    return await customObjects.listNamespacedCustomObject(
      'example-solution.metalk8s.scality.com',
      'v1alpha1',
      namespaces,
      'versionservers'
    );
  } catch (error) {
    return { error };
  }
}

export async function createClockServer(body, namespaces) {
  try {
    return await customObjects.createNamespacedCustomObject(
      'example-solution.metalk8s.scality.com',
      'v1alpha1',
      namespaces,
      'clockservers',
      body
    );
  } catch (error) {
    return { error };
  }
}

export async function createVersionServer(body, namespaces) {
  try {
    return await customObjects.createNamespacedCustomObject(
      'example-solution.metalk8s.scality.com',
      'v1alpha1',
      namespaces,
      'versionservers',
      body
    );
  } catch (error) {
    return { error };
  }
}

export async function updateClockServer(body, namespaces, name) {
  try {
    return await customObjects.patchNamespacedCustomObject(
      'example-solution.metalk8s.scality.com',
      'v1alpha1',
      namespaces,
      'clockservers',
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

export async function updateVersionServer(body, namespaces, name) {
  try {
    return await customObjects.patchNamespacedCustomObject(
      'example-solution.metalk8s.scality.com',
      'v1alpha1',
      namespaces,
      'versionservers',
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

export async function getOperatorDeployments(namespaces, name) {
  try {
    return await appsV1Api.listNamespacedDeployment(
      namespaces,
      null,
      null,
      null,
      `metadata.name=${name}`,
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

export async function listNamespacedServiceAccount(namespaces, name) {
  try {
    return await coreV1.listNamespacedServiceAccount(
      namespaces,
      null,
      null,
      null,
      `metadata.name=${name}`
    );
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

export async function listNamespacedRole(namespaces, name) {
  try {
    return await rbacAuthorizationV1Api.listNamespacedRole(
      namespaces,
      null,
      null,
      null,
      `metadata.name=${name}`
    );
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

export async function listNamespacedRoleBinding(namespaces, name) {
  try {
    return await rbacAuthorizationV1Api.listNamespacedRoleBinding(
      namespaces,
      null,
      null,
      null,
      `metadata.name=${name}`
    );
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

export async function createNamespace(body) {
  try {
    return await coreV1.createNamespace(body);
  } catch (error) {
    return { error };
  }
}

export async function getNamespaces(name) {
  try {
    return await coreV1.listNamespace(
      null,
      null,
      null,
      `metadata.name=${name}`
    );
  } catch (error) {
    return { error };
  }
}
