import ApiClient from '../ApiClient';
import {
  Config,
  CoreV1Api,
  CustomObjectsApi,
  AppsV1Api,
  RbacAuthorizationV1Api
} from '@kubernetes/client-node';

import {
  SOLUTION_CONFIGMAP_NAME,
  SOLUTION_CONFIGMAP_NAMESPACE,
  SOLUTION_API_GROUP
} from '../../constants';

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

export async function getEnvironment() {
  try {
    return await customObjects.listClusterCustomObject(
      'solutions.metalk8s.scality.com',
      'v1alpha1',
      'environments'
    );
  } catch (error) {
    return { error };
  }
}

export async function updateEnvironment(body, name) {
  try {
    return await customObjects.patchClusterCustomObject(
      'solutions.metalk8s.scality.com',
      'v1alpha1',
      'environments',
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

export async function getClockServers(namespace) {
  try {
    return await customObjects.listNamespacedCustomObject(
      SOLUTION_API_GROUP,
      'v1alpha1',
      namespace,
      'clockservers'
    );
  } catch (error) {
    return { error };
  }
}

export async function getClockServer(namespace, name) {
  try {
    return await customObjects.getNamespacedCustomObject(
      SOLUTION_API_GROUP,
      'v1alpha1',
      namespace,
      'clockservers',
      name
    );
  } catch (error) {
    return { error };
  }
}

export async function getVersionServers(namespace) {
  try {
    return await customObjects.listNamespacedCustomObject(
      SOLUTION_API_GROUP,
      'v1alpha1',
      namespace,
      'versionservers'
    );
  } catch (error) {
    return { error };
  }
}

export async function getVersionServer(namespace, name) {
  try {
    return await customObjects.getNamespacedCustomObject(
      SOLUTION_API_GROUP,
      'v1alpha1',
      namespace,
      'versionservers',
      name
    );
  } catch (error) {
    return { error };
  }
}

export async function createClockServer(body, namespace) {
  try {
    return await customObjects.createNamespacedCustomObject(
      SOLUTION_API_GROUP,
      'v1alpha1',
      namespace,
      'clockservers',
      body
    );
  } catch (error) {
    return { error };
  }
}

export async function createVersionServer(body, namespace) {
  try {
    return await customObjects.createNamespacedCustomObject(
      SOLUTION_API_GROUP,
      'v1alpha1',
      namespace,
      'versionservers',
      body
    );
  } catch (error) {
    return { error };
  }
}

export async function updateClockServer(body, namespace, name) {
  try {
    return await customObjects.patchNamespacedCustomObject(
      SOLUTION_API_GROUP,
      'v1alpha1',
      namespace,
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

export async function updateVersionServer(body, namespace, name) {
  try {
    return await customObjects.patchNamespacedCustomObject(
      SOLUTION_API_GROUP,
      'v1alpha1',
      namespace,
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

export async function getOperatorDeployment(namespace, name) {
  try {
    return await appsV1Api.readNamespacedDeployment(name, namespace);
  } catch (error) {
    return { error };
  }
}

export async function createNamespacedDeployment(namespace, body) {
  try {
    return await appsV1Api.createNamespacedDeployment(namespace, body);
  } catch (error) {
    return { error };
  }
}

export async function listNamespacedServiceAccount(namespace, name) {
  try {
    return await coreV1.readNamespacedServiceAccount(name, namespace);
  } catch (error) {
    return { error };
  }
}

export async function createNamespacedServiceAccount(namespace, body) {
  try {
    return await coreV1.createNamespacedServiceAccount(namespace, body);
  } catch (error) {
    return { error };
  }
}

export async function listNamespacedRole(namespace, name) {
  try {
    return await rbacAuthorizationV1Api.readNamespacedRole(name, namespace);
  } catch (error) {
    return { error };
  }
}

export async function createNamespacedRole(namespace, body) {
  try {
    return await rbacAuthorizationV1Api.createNamespacedRole(namespace, body);
  } catch (error) {
    return { error };
  }
}

export async function listNamespacedRoleBinding(namespace, name) {
  try {
    return await rbacAuthorizationV1Api.readNamespacedRoleBinding(
      name,
      namespace
    );
  } catch (error) {
    return { error };
  }
}

export async function createNamespacedRoleBinding(namespace, body) {
  try {
    return await rbacAuthorizationV1Api.createNamespacedRoleBinding(
      namespace,
      body
    );
  } catch (error) {
    return { error };
  }
}

export async function updateDeployment(body, namespace, name) {
  try {
    return await appsV1Api.patchNamespacedDeployment(
      name,
      namespace,
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
    return await coreV1.readNamespace(name);
  } catch (error) {
    return { error };
  }
}
export async function getSolutionsConfigMap() {
  try {
    return await coreV1.readNamespacedConfigMap(
      SOLUTION_CONFIGMAP_NAME,
      SOLUTION_CONFIGMAP_NAMESPACE
    );
  } catch (error) {
    return { error };
  }
}
