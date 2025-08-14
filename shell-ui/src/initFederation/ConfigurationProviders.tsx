import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { IconName } from '@scality/core-ui/dist/components/icon/Icon.component';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { SolutionUI } from '@scality/module-federation';
import React, { useMemo, useSyncExternalStore } from 'react';
import { useQueries, UseQueryResult } from 'react-query';
import { useShellConfig } from './ShellConfigProvider';
import { useShellHistory } from './ShellHistoryProvider';
import { useDeployedApps, useDeployedAppsRetriever } from './UIListProvider';

export type OAuth2ProxyConfig = {
  kind: 'OAuth2Proxy'; //todo : add other entries
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
    // This information is not present in the original webFinger, it's filled by the ConfigurationProvider
    url: string;
  };
};
export function useConfigRetriever(): {
  retrieveConfiguration: <T extends 'build' | Record<string, unknown>>(arg0: {
    configType: T extends 'build' ? 'build' : 'run';
    name: string;
    url?: string;
  }) =>
    | (T extends 'build' ? EnrichedBuildtimeWebFinger : RuntimeWebFinger<T>)
    | null;
} {
  const { state: webFingerContextValue } = useWebFingersStore();
  const { retrieveDeployedApps } = useDeployedAppsRetriever();

  if (!webFingerContextValue) {
    throw new Error(
      "Can't use useConfigRetriever outside of ConfigurationProvider",
    );
  }

  return {
    // @ts-expect-error - impossible to type
    retrieveConfiguration: ({ configType, name, url }) => {
      if (configType !== 'build' && configType !== 'run') {
        throw new Error(
          `Invalid configType : it should be build or run but received ${configType}`,
        );
      }

      const apps = retrieveDeployedApps({
        name,
      });

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
      const config = configs.find((webFinger) => {
        if (
          webFinger.kind === 'MicroAppRuntimeConfiguration' &&
          webFinger.metadata.name === name
        ) {
          return true;
        }
        if (
          webFinger.kind === 'MicroAppConfiguration' &&
          webFinger.metadata.kind === apps[0].kind
        ) {
          if (url) {
            return webFinger.metadata.url === url;
          }
          return true;
        }
        return false;
      });

      if (!config) {
        const listOfKnownConfigurations = JSON.stringify(configs, null, 2);
        if (configType === 'build') {
          throw new Error(
            `MicroApp's MicroAppConfiguration not found for app with kind ${apps[0].kind}.
            This error usually happens when your app's "kind" in deployed-ui-apps does not match the MicroAppConfiguration.
            Please check your MicroAppConfiguration. Here is a list of known configurations:
            ${listOfKnownConfigurations}`,
          );
        }
        if (configType === 'run') {
          throw new Error(
            `MicroApp's RuntimeAppConfiguration not found for app with name ${name} and kind ${apps[0].kind}.
            This error usually happens when your app's "name" and "kind" in deployed-ui-apps does not match the RuntimeAppConfiguration.
            Please check your RuntimeAppConfiguration. Here is a list of known configurations:
            ${listOfKnownConfigurations}`,
          );
        }
      }
      return config;
    },
  };
}
export function useConfig<T extends 'build' | Record<string, unknown>>({
  configType,
  name,
}: {
  configType: T extends 'build' ? 'build' : 'run';
  name: string;
}): null | T extends 'build'
  ? EnrichedBuildtimeWebFinger
  : RuntimeWebFinger<T> {
  // Utiliser le nouveau hook useWebFingersStore
  const { state: webFingerContextValue } = useWebFingersStore();

  // Utiliser le retrieveConfiguration du hook useConfigRetriever
  const { retrieveConfiguration } = useConfigRetriever();

  // Vérifier que le contexte est disponible
  if (!webFingerContextValue || webFingerContextValue.length === 0) {
    throw new Error("Can't use useConfig outside of ConfigurationProvider");
  }

  // Récupérer et retourner la configuration
  return retrieveConfiguration({
    configType,
    name,
  });
}
export type FederatedView = {
  isFederated: true;
  app: SolutionUI;
  view: View;
  groups?: string[];
  icon?: IconName;
  navbarGroup: 'main' | 'subLogin';
};
export type NonFederatedView = {
  isFederated: false;
  url: string;
  view: {
    label: {
      en: string;
      fr: string;
    };
  };
  isExternal: boolean;
  groups?: string[];
  navbarGroup: 'main' | 'subLogin';
  icon?: IconName;
};
export type ViewDefinition = FederatedView | NonFederatedView;

// External store implementation
class WebFingersStore {
  private listeners: Set<() => void> = new Set();
  private _state: UseQueryResult<
    EnrichedBuildtimeWebFinger | RuntimeWebFinger<Record<string, unknown>>,
    unknown
  >[] = [];

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = () => {
    return this._state;
  };

  private isStateEqual(
    currentState: UseQueryResult<
      EnrichedBuildtimeWebFinger | RuntimeWebFinger<Record<string, unknown>>,
      unknown
    >[],
    newState: UseQueryResult<
      EnrichedBuildtimeWebFinger | RuntimeWebFinger<Record<string, unknown>>,
      unknown
    >[],
  ) {
    return (
      currentState.length === newState.length &&
      currentState.every(
        (item, index) =>
          JSON.stringify(item) === JSON.stringify(newState[index]),
      )
    );
  }

  updateState = (
    newState: UseQueryResult<
      EnrichedBuildtimeWebFinger | RuntimeWebFinger<Record<string, unknown>>,
      unknown
    >[],
  ) => {
    if (!this.isStateEqual(this._state, newState)) {
      this._state = newState;
      this.listeners.forEach((listener) => listener());
    }
  };
}

const webFingersStore = new WebFingersStore();

export function useWebFingersStore() {
  const state = useSyncExternalStore(
    webFingersStore.subscribe,
    webFingersStore.getState,
  );

  return {
    state,
    updateWebFingersState: webFingersStore.updateState,
  };
}

export function useDiscoveredViews(): ViewDefinition[] {
  const { retrieveConfiguration } = useConfigRetriever();
  const { retrieveDeployedApps } = useDeployedAppsRetriever();
  const { config: shellConfig } = useShellConfig();

  const discoveredViews = [
    ...shellConfig.navbar.main.map((entry) => ({
      ...entry,
      navbarGroup: 'main',
    })),
    ...shellConfig.navbar.subLogin.map((entry) => ({
      ...entry,
      navbarGroup: 'subLogin',
    })),
    // @ts-expect-error - FIXME when you are working on it
  ].flatMap((navbarEntry) => {
    if (!navbarEntry.kind || !navbarEntry.view) {
      return [
        {
          url: navbarEntry.url,
          isExternal: navbarEntry.isExternal,
          icon: navbarEntry.icon,
          view: {
            label: navbarEntry.label,
          },
          groups: navbarEntry.groups,
          isFederated: false,
          navbarGroup: navbarEntry.navbarGroup,
        },
      ];
    }

    const matchingApps = retrieveDeployedApps({
      kind: navbarEntry.kind,
    });

    if (!matchingApps || matchingApps.length === 0) {
      return [];
    }

    const app = matchingApps[0];
    const appBuildConfig = retrieveConfiguration<'build'>({
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
  }) as ViewDefinition[];
  return discoveredViews;
}

type FederatedRoute = {
  app: SolutionUI;
  view: View;
};
export function useFederatedRoutes(): FederatedRoute[] {
  const { retrieveConfiguration } = useConfigRetriever();
  const { retrieveDeployedApps } = useDeployedAppsRetriever();
  const deployedApps = retrieveDeployedApps();

  const federatedRoutes = React.useMemo(() => {
    return deployedApps.flatMap((app) => {
      // Validate base path once per app during iteration
      if (app.appHistoryBasePath.endsWith('/')) {
        throw new Error(
          `appHistoryBasePath of app ${app.name} ends with a /, this is not allowed`,
        );
      }

      const appBuildConfig = retrieveConfiguration<'build'>({
        configType: 'build',
        name: app.name,
        url: app.url,
      });

      if (!appBuildConfig) {
        return [];
      }

      const routesFromSingleApp = Object.entries(appBuildConfig.spec.views).map(
        ([view]) => {
          return {
            kind: app.kind,
            view: appBuildConfig.spec.views[view],
            app,
          };
        },
      );

      return routesFromSingleApp;
    });
  }, [deployedApps, retrieveConfiguration]);

  return federatedRoutes;
}

export const useLinkOpener = () => {
  const navigate = useShellHistory();
  return {
    openLink: (
      to:
        | {
          isExternal?: boolean;
          app: SolutionUI;
          view: View;
          isFederated: true;
        }
        | {
          isFederated: false;
          isExternal?: boolean;
          url: string;
        },
    ) => {
      if (to.isExternal) {
        if (to.isFederated) {
          window.open(to.app.appHistoryBasePath + to.view.path, '_blank');
        } else {
          // @ts-expect-error - FIXME when you are working on it
          window.open(to.url, '_blank');
        }
      } else if (to.isFederated) {
        navigate(to.app.appHistoryBasePath + to.view.path);
      } else {
        // @ts-expect-error - FIXME when you are working on it
        window.location.href = to.url;
      }
    },
  };
};
export const ConfigurationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { updateWebFingersState } = useWebFingersStore();
  const deployedUIs = useDeployedApps();

  const results = useQueries(
    deployedUIs.flatMap((ui) => [
      {
        queryKey: `${ui.name}.${ui.kind}.${ui.version}-buildtime-WebFinger`,
        refetchOnWindowFocus: false,
        queryFn: () => {
          return fetch(
            `${ui.url}/.well-known/micro-app-configuration?version=${ui.version}`,
          ).then(async (r) => {
            if (r.ok) {
              const json: BuildtimeWebFinger = await r.json();

              // @ts-expect-error - At this point, the url is not defined, but the user may define it by error
              // so we are going to check and warn the user if needed.
              const shouldNotBeDefinedUrl = json.metadata.url;

              if (shouldNotBeDefinedUrl != null) {
                console.warn(
                  `MicroApp's MicroAppConfiguration url is already set to ${shouldNotBeDefinedUrl}.
                  This information will be overridden by the value discovered in discoveryUrl.`,
                );
              }

              const enrichedJson: EnrichedBuildtimeWebFinger = {
                ...json,
                metadata: {
                  ...json.metadata,
                  url: ui.url,
                },
              };
              return enrichedJson;
            } else {
              return Promise.reject();
            }
          });
        },
      },
      {
        queryKey: `${ui.name}.${ui.kind}.${ui.version}-runtime-WebFinger`,
        refetchOnWindowFocus: false,
        queryFn: () => {
          return fetch(
            `${ui.url}/.well-known/runtime-app-configuration?version=${ui.version}`,
          ).then((r) => {
            if (r.ok) {
              return r.json() as Promise<
                RuntimeWebFinger<Record<string, unknown>>
              >;
            } else {
              return Promise.reject();
            }
          });
        },
      },
    ]),
  );

  useMemo(() => {
    updateWebFingersState(results);
  }, [results]);

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

  return (
    <>
      {(globalStatus === 'loading' || globalStatus === 'idle') && (
        <Loader size="massive" centered={true} aria-label="loading" />
      )}
      {globalStatus === 'error' && <ErrorPage500 data-cy="sc-error-page500" />}
      {globalStatus === 'success' && children}
    </>
  );
};
