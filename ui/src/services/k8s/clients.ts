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
  /** A GET whose answer is text rather than JSON, rejecting as the generated clients do. */
  text: (path: string, query?: Query, headers?: Record<string, string>) => Promise<string>;
  /**
   * A GET of any API path, its JSON untouched (the generated v1.13 models drop newer fields). Rejects
   * as the generated clients do, keeping the status even when the error body is not JSON.
   */
  json: <T = unknown>(path: string, query?: Query, headers?: Record<string, string>) => Promise<T>;
};

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Shared with useK8sApiConfig so that callers without React get the same clients — an MCP tool
 * builds this from its own context, where there is no store and no hook to call. The hook holds the
 * React half (redux for the URL, useAuth for the token) and nothing else.
 */
export const k8sApi = (url: string, token: string): K8sApiClients => {
  const config = new Config(url, token);

  /**
   * Every generated method sets `json: true`, and the browser request layer then calls
   * `response.json()` — so a pod log, served as text/plain, rejects with a SyntaxError carrying no
   * status code before any caller sees it. readNamespacedPodLog cannot read a log in a browser at
   * all, and no argument to it changes that.
   */
  const text = async (path: string, query: Query = {}, headers: Record<string, string> = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined) search.set(key, String(value));
    // `.size` is newer than the browsers this UI supports, and reads as empty where it is missing.
    const suffix = search.toString();

    const response = await fetch(`${url}${path}${suffix ? `?${suffix}` : ''}`, {
      headers: { ...headers, authorization: `Bearer ${token}` },
    });
    const body = await response.text();

    if (!response.ok) {
      let parsed: unknown = body;
      // The API answers errors as JSON even here, which is what carries the message a caller needs.
      try {
        parsed = JSON.parse(body);
      } catch {}
      throw { response: { statusCode: response.status }, body: parsed };
    }
    return body;
  };

  // Through `text`: a path the API server does not route gets a plain-text 404, and parsing it first
  // would lose the status.
  const json = async <T = unknown>(
    path: string,
    query: Query = {},
    headers: Record<string, string> = {},
  ): Promise<T> => {
    const body = await text(path, query, headers);
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new SyntaxError(`The Kubernetes API answered ${path} with something other than JSON.`);
    }
  };

  return {
    text,
    json,
    coreV1: config.makeApiClient(CoreV1Api),
    customObjects: config.makeApiClient(CustomObjectsApi),
    storage: config.makeApiClient(StorageV1Api),
    appsV1: config.makeApiClient(AppsV1Api),
  };
};
