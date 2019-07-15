import ApiClient from '../ApiClient';
import { Config, Core_v1Api } from '@kubernetes/client-node';

let config, coreV1;
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
