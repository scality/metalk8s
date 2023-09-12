import { Config } from '@kubernetes/client-node/dist/browser/config';
import { CoreV1Api } from '@kubernetes/client-node/dist/gen/api/coreV1Api';
import { CustomObjectsApi } from '@kubernetes/client-node/dist/gen/api/customObjectsApi';
import { StorageV1Api } from '@kubernetes/client-node/dist/gen/api/storageV1Api';
import { AppsV1Api } from '@kubernetes/client-node/dist/gen/api/appsV1Api';
import { RootState } from '../../ducks/reducer';
import { useAuth } from '../../containers/PrivateRoute';
import { useSelector } from 'react-redux';
let config: typeof Config;
export let coreV1: CoreV1Api;
export let customObjects: CustomObjectsApi;
export let storage: StorageV1Api;
export let appsV1: AppsV1Api;

type K8sApiConfig = {
  coreV1: CoreV1Api;
  customObjects: CustomObjectsApi;
  storage: StorageV1Api;
  appsV1: AppsV1Api;
};

export const useK8sApiConfig = (): K8sApiConfig => {
  const api = useSelector((state: RootState) => state.config.api);
  const { userData } = useAuth();
  const token = userData?.token || '';

  const config = new Config(api?.url, token);

  const coreV1 = config.makeApiClient(CoreV1Api);
  const customObjects = config.makeApiClient(CustomObjectsApi);
  const storage = config.makeApiClient(StorageV1Api);
  const appsV1 = config.makeApiClient(AppsV1Api);
  return { coreV1, customObjects, storage, appsV1 };
};

export const updateApiServerConfig = (
  url: string,
  id_token: string,
  token_type?: string,
) => {
  config = new Config(url, id_token, token_type);
  coreV1 = config.makeApiClient(CoreV1Api);
  customObjects = config.makeApiClient(CustomObjectsApi);
  storage = config.makeApiClient(StorageV1Api);
  appsV1 = config.makeApiClient(AppsV1Api);
  return { coreV1, customObjects, storage, appsV1 };
};
