// Every generated Kubernetes client, for one API URL and one token.
//
// A file of its own, and deliberately free of React: `./MCPTools` is imported by shell-ui on every
// page to register the tools, so whatever this reaches is loaded with it. Left in api.ts, that was
// useAuth, which reaches PrivateRoute, the hooks barrel, the redux ducks and core-ui — most of the
// app, pulled in to build four client objects, with those modules' top-level code running outside
// the providers the app would have given them.

import { Config } from '@kubernetes/client-node/dist/browser/config';
import { AppsV1Api } from '@kubernetes/client-node/dist/gen/api/appsV1Api';
import { CoreV1Api } from '@kubernetes/client-node/dist/gen/api/coreV1Api';
import { CustomObjectsApi } from '@kubernetes/client-node/dist/gen/api/customObjectsApi';
import { StorageV1Api } from '@kubernetes/client-node/dist/gen/api/storageV1Api';

export type K8sApiClients = {
  coreV1: CoreV1Api;
  customObjects: CustomObjectsApi;
  storage: StorageV1Api;
  appsV1: AppsV1Api;
};

/**
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
  };
};
