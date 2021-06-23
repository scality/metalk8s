//@flow
import { createContext, useContext, type Node } from 'react';
import { useQueries } from 'react-query';
import { useDeployedApps, useDeployedAppsRetriever } from './UIListProvider';

const WebFingersContext = createContext(null);

export type OAuth2ProxyConfig = {
  kind: 'OAuth2Proxy',
  //todo : add other entries
};

export type OIDCConfig = {
  kind: 'OIDC',
  providerUrl: string,
  redirectUrl: string,
  clientId: string,
  responseType: string,
  scopes: string,
};

type RuntimeWebFinger = {
  kind: 'MicroAppRuntimeConfiguration',
  apiVersion: 'ui.scality.com/v1alpha1',
  metadata: {
    kind: string,
    name: string,
  },
  spec: {
    title: string,
    selfConfiguration: any,
    auth: OIDCConfig | OAuth2ProxyConfig,
  },
};

type FederatedModuleInfo = {
  module: string,
  scope: string,
};

type BuildtimeWebFinger = {
  kind: 'MicroAppConfiguration',
  apiVersion: 'ui.scality.com/v1alpha1',
  metadata: {
    kind: string,
  },
  spec: {
    remoteEntryPath: string,
    views: {
      [viewKey: string]: {
        path: string,
        exact?: boolean,
        strict?: boolean,
        sensitive?: boolean,
        label: {
          en: string,
          fr: string,
        },
      } & FederatedModuleInfo,
    },
    hooks: {
      [hookName: string]: FederatedModuleInfo,
    },
    components: {
      [componentName: string]: FederatedModuleInfo,
    },
  },
};

export function useConfigRetriever(): {
  retrieveConfiguration: ({ configType: 'build' | 'run', name: string }) =>
    | RuntimeWebFinger
    | BuildtimeWebFinger
    | null,
} {
  const { retrieveDeployedApps } = useDeployedAppsRetriever();
  const webFingerContextValue = useContext(WebFingersContext);
  if (!webFingerContextValue) {
    throw new Error(
      "Can't use useConfigRetriever outside of ConfigurationProvider",
    );
  }

  return {
    retrieveConfiguration: ({ configType, name }) => {
      if (configType !== 'build' && configType !== 'run') {
        throw new Error(
          `Invalid configType : it should be build or run but recieved ${configType}`,
        );
      }

      const apps = retrieveDeployedApps({ name });

      if (!apps || apps.length === 0) {
        return null;
      }

      const configs = webFingerContextValue
        .filter((webFinger) => {
          return (
            webFinger.status === 'success' &&
            ((configType === 'build' &&
              webFinger.data.kind === 'MicroAppConfiguration') ||
              (configType === 'run' &&
                webFinger.data.kind === 'MicroAppRuntimeConfiguration'))
          );
        })
        .map((webFinger) => webFinger.data);

      ///TODO validate web fingers against JsonSchemas

      return configs.find(
        (webFinger) =>
          (webFinger.kind === 'MicroAppRuntimeConfiguration' &&
            webFinger.metadata.name === name) ||
          (webFinger.kind === 'MicroAppConfiguration' &&
            webFinger.metadata.kind === apps[0].kind),
      );
    },
  };
}

export function useConfig({
  configType,
  name,
}: {
  configType: 'build' | 'run',
  name: string,
}): RuntimeWebFinger | BuildtimeWebFinger | null {
  const { retrieveConfiguration } = useConfigRetriever();
  const webFingerContextValue = useContext(WebFingersContext);
  if (!webFingerContextValue) {
    throw new Error("Can't use useConfig outside of ConfigurationProvider");
  }

  return retrieveConfiguration({ configType, name });
}

export const ConfigurationProvider = ({
  children,
}: {
  children: Node,
}): Node => {
  const deployedUIs = useDeployedApps();
  const results = useQueries(
    deployedUIs.flatMap((ui) => [
      {
        queryKey: `${ui.name}.${ui.kind}.${ui.version}-buildtime-WebFinger`,
        refetchOnWindowFocus: false,
        queryFn: () => {
          return fetch(`${ui.url}/.well-known/micro-app-configuration`).then(
            (r) => {
              if (r.ok) {
                return r.json();
              } else {
                return Promise.reject();
              }
            },
          );
        },
      },
      {
        queryKey: `${ui.name}.${ui.kind}.${ui.version}-runtime-WebFinger`,
        refetchOnWindowFocus: false,
        queryFn: () => {
          return fetch(`${ui.url}/.well-known/runtime-app-configuration`).then(
            (r) => {
              if (r.ok) {
                return r.json();
              } else {
                return Promise.reject();
              }
            },
          );
        },
      },
    ]),
  );

  return (
    <WebFingersContext.Provider value={results}>
      {children}
    </WebFingersContext.Provider>
  );
};
