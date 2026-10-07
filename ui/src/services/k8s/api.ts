import { Config } from '@kubernetes/client-node/dist/browser/config';
import { AppsV1Api } from '@kubernetes/client-node/dist/gen/api/appsV1Api';
import { BatchV1Api } from '@kubernetes/client-node/dist/gen/api/batchV1Api';
import { BatchV1beta1Api } from '@kubernetes/client-node/dist/gen/api/batchV1beta1Api';
import { CoreV1Api } from '@kubernetes/client-node/dist/gen/api/coreV1Api';
import { CustomObjectsApi } from '@kubernetes/client-node/dist/gen/api/customObjectsApi';
import { StorageV1Api } from '@kubernetes/client-node/dist/gen/api/storageV1Api';
import { useSelector } from 'react-redux';
import { useAuth } from '../../containers/PrivateRoute';
import type { RootState } from '../../ducks/reducer';
import { Metalk8sV1alpha1VolumeClient } from './Metalk8sVolumeClient.generated';

let config: typeof Config;
export let coreV1: CoreV1Api;
export let customObjects: CustomObjectsApi;
export let storage: StorageV1Api;
export let appsV1: AppsV1Api;

export type K8sApiClients = {
  coreV1: CoreV1Api;
  customObjects: CustomObjectsApi;
  storage: StorageV1Api;
  appsV1: AppsV1Api;
  batchV1: BatchV1Api;
  batchV1beta1: BatchV1beta1Api;
};

type K8sApiConfig = {
  coreV1: CoreV1Api;
  customObjectsApi: Metalk8sV1alpha1VolumeClient;
  storage: StorageV1Api;
  appsV1: AppsV1Api;
};

/**
 * Every generated client, for one API URL and one token.
 *
 * Shared with useK8sApiConfig so that callers without React get the same clients — an MCP tool
 * builds this from its own context, where there is no store and no hook to call. The hook holds the
 * React half (redux for the URL, useAuth for the token) and nothing else.
 */
export const k8sApi = (url: string, token: string): K8sApiClients => {
  const config = new Config(url, token);

  return {
    coreV1: config.makeApiClient(CoreV1Api),
    customObjects: config.makeApiClient(CustomObjectsApi),
    storage: config.makeApiClient(StorageV1Api),
    appsV1: config.makeApiClient(AppsV1Api),
    batchV1: config.makeApiClient(BatchV1Api),
    batchV1beta1: config.makeApiClient(BatchV1beta1Api),
  };
};

export const useK8sApiConfig = (): K8sApiConfig => {
  const api = useSelector((state: RootState) => state.config.api);
  const { userData } = useAuth();
  const token = userData?.token || '';

  const { coreV1, customObjects, storage, appsV1 } = k8sApi(api?.url, token);

  return {
    coreV1,
    customObjectsApi: new Metalk8sV1alpha1VolumeClient(customObjects),
    storage,
    appsV1,
  };
};

export const updateApiServerConfig = (url: string, id_token: string, token_type?: string) => {
  config = new Config(url, id_token, token_type);
  coreV1 = config.makeApiClient(CoreV1Api);
  customObjects = config.makeApiClient(CustomObjectsApi);
  storage = config.makeApiClient(StorageV1Api);
  appsV1 = config.makeApiClient(AppsV1Api);
  return { coreV1, customObjects, storage, appsV1 };
};
