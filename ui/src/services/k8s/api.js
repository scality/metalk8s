import ApiClient from '../ApiClient';
import {
  Config,
  Core_v1Api,
  Custom_objectsApi,
  Storage_v1Api
} from '@kubernetes/client-node';

let config;
let coreV1;
let customObjects;
let storage;
let k8sApiClient = null;

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
  coreV1 = config.makeApiClient(Core_v1Api);
  customObjects = config.makeApiClient(Custom_objectsApi);
  storage = config.makeApiClient(Storage_v1Api);
};

export async function getNodes() {
  try {
    return await coreV1.listNode();
  } catch (error) {
    return { error };
  }
}

export async function getPods() {
  try {
    return await coreV1.listPodForAllNamespaces();
  } catch (error) {
    return { error };
  }
}

export async function createNode(payload) {
  try {
    return await coreV1.createNode(payload);
  } catch (error) {
    return { error };
  }
}

export async function getVolumes() {
  try {
    // We want to change this hardcoded data later
    return await customObjects.listClusterCustomObject(
      'storage.metalk8s.scality.com',
      'v1alpha1',
      'volumes'
    );
  } catch (error) {
    return { error };
  }
}

export async function getPersistentVolumes() {
  try {
    return await coreV1.listPersistentVolume();
  } catch (error) {
    return { error };
  }
}

export async function getStorageClass() {
  try {
    return await storage.listStorageClass();
  } catch (error) {
    return { error };
  }
}

export async function createVolume(body) {
  try {
    return await customObjects.createClusterCustomObject(
      'storage.metalk8s.scality.com',
      'v1alpha1',
      'volumes',
      body
    );
  } catch (error) {
    return { error };
  }
}
