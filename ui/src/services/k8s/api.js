import ApiClient from '../ApiClient';

import { Config } from '@kubernetes/client-node/dist/browser/config';
import { CoreV1Api } from '@kubernetes/client-node/dist/gen/api/coreV1Api';
import { CustomObjectsApi } from '@kubernetes/client-node/dist/gen/api/customObjectsApi';
import { StorageV1Api } from '@kubernetes/client-node/dist/gen/api/storageV1Api';

let config;
let k8sApiClient = null;
export let coreV1;
export let customObjects;
export let storage;

export function initialize(apiUrl) {
  k8sApiClient = new ApiClient({ apiUrl });
}

export const updateApiServerConfig = (url, token) => {
  config = new Config(url, token, 'Basic');
  coreV1 = config.makeApiClient(CoreV1Api);
  customObjects = config.makeApiClient(CustomObjectsApi);
  storage = config.makeApiClient(StorageV1Api);
};

//Basic Auth
export function authenticate(token) {
  return k8sApiClient.get('/api/v1', null, {
    headers: {
      Authorization: 'Basic ' + token,
    },
  });
}
