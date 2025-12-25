import type { SolutionUI } from '@scality/module-federation';
import type { UseQueryResult } from 'react-query';

export type OAuth2ProxyConfig = {
  kind: 'OAuth2Proxy';
};

export type OIDCConfig = {
  kind: 'OIDC';
  providerUrl: string;
  redirectUrl: string;
  clientId: string;
  responseType: string;
  scopes: string;
  providerLogout?: boolean;
  defaultDexConnector?: string;
};

export type FederatedModuleInfo = {
  module: string;
  scope: string;
};

export type View = {
  path: string;
  activeIfMatches?: string;
  exact?: boolean;
  strict?: boolean;
  sensitive?: boolean;
  label: {
    en: string;
    fr: string;
  };
} & FederatedModuleInfo;

export type RuntimeWebFinger<C> = {
  kind: 'MicroAppRuntimeConfiguration';
  apiVersion: 'ui.scality.com/v1alpha1';
  metadata: {
    kind: string;
    name: string;
  };
  spec: {
    title: string;
    selfConfiguration: C;
    auth: OIDCConfig | OAuth2ProxyConfig;
  };
};

export type BuildtimeWebFinger = {
  kind: 'MicroAppConfiguration';
  apiVersion: 'ui.scality.com/v1alpha1';
  metadata: {
    kind: string;
  };
  spec: {
    remoteEntryPath: string;
    views: Record<string, View>;
    hooks: Record<string, FederatedModuleInfo>;
    components: Record<string, FederatedModuleInfo>;
    navbarUpdaterComponents?: FederatedModuleInfo[];
    instanceNameAdapter?: FederatedModuleInfo;
  };
};

export type EnrichedBuildtimeWebFinger = BuildtimeWebFinger & {
  metadata: {
    url: string;
  };
};

export type WebFingerResult = UseQueryResult<
  EnrichedBuildtimeWebFinger | RuntimeWebFinger<Record<string, unknown>>,
  unknown
>;

export interface ConfigurationState {
  counter: number;
  incrementCounter: () => void;
  decrementCounter: () => void;
  resetCounter: () => void;
  // State
  webFingers: WebFingerResult[];
  deployedApps: SolutionUI[];

  // Actions
  setWebFingers: (webFingers: WebFingerResult[]) => void;
  setDeployedApps: (apps: SolutionUI[]) => void;

  // Selectors
  getConfiguration: <T extends 'build' | Record<string, unknown>>(params: {
    configType: T extends 'build' ? 'build' : 'run';
    name: string;
    url?: string;
  }) =>
    | (T extends 'build' ? EnrichedBuildtimeWebFinger : RuntimeWebFinger<T>)
    | null;

  getDeployedApps: (filter?: { name?: string; kind?: string }) => SolutionUI[];
}
