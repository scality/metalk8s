//@flow
import { createContext, useContext, type Node } from 'react';
import { useQueries } from 'react-query';
import { useShellConfig } from './ShellConfigProvider';
import { useHistory } from 'react-router-dom';
import { useDeployedApps, useDeployedAppsRetriever } from './UIListProvider';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';
import ErrorPage500 from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';

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

export type View = {
  path: string,
  exact?: boolean,
  strict?: boolean,
  sensitive?: boolean,
  label: {
    en: string,
    fr: string,
  },
} & FederatedModuleInfo;

type BuildtimeWebFinger = {
  kind: 'MicroAppConfiguration',
  apiVersion: 'ui.scality.com/v1alpha1',
  metadata: {
    kind: string,
  },
  spec: {
    remoteEntryPath: string,
    views: {
      [viewKey: string]: View,
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

export function useDiscoveredViews(): (
  | {
      isFederated: true,
      app: SolutionUI,
      view: View,
      groups?: string[],
      icon?: string,
      navbarGroup: 'main' | 'sublogin',
    }
  | {
      isFederated: false,
      url: string,
      isExternal: boolean,
      groups?: string[],
      navbarGroup: 'main' | 'sublogin',
      icon?: string,
    }
)[] {
  const { retrieveConfiguration } = useConfigRetriever();
  const { retrieveDeployedApps } = useDeployedAppsRetriever();
  const { config: shellConfig } = useShellConfig();
  const deployedApps = retrieveDeployedApps();

  const discoveredViews = [
    ...shellConfig.navbar.main.map((entry) => ({
      ...entry,
      navbarGroup: 'main',
    })),
    ...shellConfig.navbar.subLogin.map((entry) => ({
      ...entry,
      navbarGroup: 'subLogin',
    })),
  ].flatMap((navbarEntry) => {
    if (!navbarEntry.kind || !navbarEntry.view) {
      return [
        {
          url: navbarEntry.url,
          isExternal: navbarEntry.isExternal,
          icon: navbarEntry.icon,
          groups: navbarEntry.groups,
          isFederated: false,
          navbarGroup: navbarEntry.navbarGroup,
        },
      ];
    }
    const matchingApps = retrieveDeployedApps({ kind: navbarEntry.kind });
    if (!matchingApps || matchingApps.length === 0) {
      return [];
    }
    const app = matchingApps[0];
    const appBuildConfig = retrieveConfiguration({
      configType: 'build',
      name: app.name,
    });
    if (
      appBuildConfig &&
      appBuildConfig.spec.views &&
      appBuildConfig.spec.views[navbarEntry.view]
    ) {
      const view = appBuildConfig.spec.views[navbarEntry.view];
      return [
        {
          view,
          app,
          groups: navbarEntry.groups,
          icon: navbarEntry.icon,
          navbarGroup: navbarEntry.navbarGroup,
          isFederated: true,
        },
      ];
    }

    return [];
  });

  return discoveredViews;
}

export const useLinkOpener = () => {
  const history = useHistory();
  return {
    openLink: (
      to:
        | {
            isExternal: boolean,
            app: SolutionUI,
            view: View,
            isFederated: true,
          }
        | { isFederated: false, isExternal: boolean, url: string },
    ) => {
      if (to.isExternal) {
        if (to.isFederated) {
          window.open(to.app.appHistoryBasePath + to.view.path, '_blank');
        } else {
          window.open(to.url, '_blank');
        }
      } else if (to.isFederated) {
        history.push(to.app.appHistoryBasePath + to.view.path);
      } else {
        window.location.href = to.url;
      }
    },
  };
};

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

  const statuses = Array.from(new Set(results.map((result) => result.status)));

  const globalStatus = statuses.includes('error')
    ? 'error'
    : statuses.includes('loading')
    ? 'loading'
    : statuses.includes('idle') && !statuses.includes('success')
    ? 'idle'
    : statuses.includes('idle') && statuses.includes('success')
    ? 'loading'
    : 'success';

  console.log('Statuses    ', globalStatus, statuses);

  return (
    <WebFingersContext.Provider value={results}>
      {(globalStatus === 'loading' || globalStatus === 'idle') && (
        <Loader size="massive" centered={true} aria-label="loading" />
      )}
      {globalStatus === 'error' && <ErrorPage500 data-cy="sc-error-page500" />}
      {globalStatus === 'success' && children}
    </WebFingersContext.Provider>
  );
};
