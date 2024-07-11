import { CoreUiThemeProvider } from '@scality/core-ui/dist/components/coreuithemeprovider/CoreUiThemeProvider';
import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { ScrollbarWrapper } from '@scality/core-ui/dist/components/scrollbarwrapper/ScrollbarWrapper.component';
import { ToastProvider } from '@scality/core-ui/dist/components/toast/ToastProvider';
import {
  FederatedComponent,
  FederatedComponentProps,
  SolutionUI,
} from '@scality/module-federation';
import { createBrowserHistory } from 'history';
import React, { useEffect, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Route, Router, Switch } from 'react-router-dom';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';

import NotificationCenterProvider, {
  NotificationCenterContextType,
} from './NotificationCenterProvider';
import { AuthConfigProvider, useAuthConfig } from './auth/AuthConfigProvider';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { FirstTimeLoginProvider } from './auth/FirstTimeLoginProvider';
import './index.css';
import {
  ConfigurationProvider,
  FederatedView,
  useConfigRetriever,
  useConfig,
  useDiscoveredViews,
  useLinkOpener,
  BuildtimeWebFinger,
  RuntimeWebFinger,
} from './initFederation/ConfigurationProviders';
import {
  ShellConfigProvider,
  useShellConfig,
} from './initFederation/ShellConfigProvider';
import { ShellHistoryProvider } from './initFederation/ShellHistoryProvider';
import {
  ShellThemeSelectorProvider,
  useShellThemeSelector,
} from './initFederation/ShellThemeSelectorProvider';
import {
  UIListProvider,
  useDeployedApps,
} from './initFederation/UIListProvider';
import { SolutionsNavbar } from './navbar';
import { LanguageProvider, useLanguage } from './navbar/lang';
import AlertProvider from './alerts/AlertProvider';
import {
  getAlertingAlertSelectors,
  getAuthenticationAlertSelectors,
  getBootstrapAlertSelectors,
  getDashboardingAlertSelectors,
  getIngressControllerAlertSelectors,
  getK8SMasterAlertSelectors,
  getLoggingAlertSelectors,
  getMonitoringAlertSelectors,
  getNetworksAlertSelectors,
  getNodesAlertSelectors,
  getPlatformAlertSelectors,
  getServicesAlertSelectors,
  getVolumesAlertSelectors,
  useAlerts,
  useHighestSeverityAlerts,
} from './alerts';
import { useHistory } from 'react-router';
import { useQuery, UseQueryResult } from 'react-query';
import { loadShare } from '@module-federation/enhanced/runtime';

export const queryClient = new QueryClient();

export type ShellTypes = {
  shellHooks: {
    useAuthConfig: typeof useAuthConfig;
    useAuth: typeof useAuth;
    useConfigRetriever: typeof useConfigRetriever;
    useDiscoveredViews: typeof useDiscoveredViews;
    useShellConfig: typeof useShellConfig;
    useLanguage: typeof useLanguage;
    useConfig: typeof useConfig;
    useLinkOpener: typeof useLinkOpener;
    useDeployedApps: typeof useDeployedApps;
    useShellThemeSelector: typeof useShellThemeSelector;
  };
  shellAlerts: {
    AlertsProvider: typeof AlertProvider;
    hooks: {
      useAlerts: typeof useAlerts;
      useHighestSeverityAlerts: typeof useHighestSeverityAlerts;
    };
    alertSelectors: {
      getPlatformAlertSelectors: typeof getPlatformAlertSelectors;
      getNodesAlertSelectors: typeof getNodesAlertSelectors;
      getVolumesAlertSelectors: typeof getVolumesAlertSelectors;
      getNetworksAlertSelectors: typeof getNetworksAlertSelectors;
      getServicesAlertSelectors: typeof getServicesAlertSelectors;
      getK8SMasterAlertSelectors: typeof getK8SMasterAlertSelectors;
      getBootstrapAlertSelectors: typeof getBootstrapAlertSelectors;
      getMonitoringAlertSelectors: typeof getMonitoringAlertSelectors;
      getAlertingAlertSelectors: typeof getAlertingAlertSelectors;
      getLoggingAlertSelectors: typeof getLoggingAlertSelectors;
      getDashboardingAlertSelectors: typeof getDashboardingAlertSelectors;
      getIngressControllerAlertSelectors: typeof getIngressControllerAlertSelectors;
      getAuthenticationAlertSelectors: typeof getAuthenticationAlertSelectors;
    };
  };
};

declare global {
  interface Window {
    shellContexts: {
      ShellHistoryContext: React.Context<ReturnType<typeof useHistory> | null>;
      NotificationContext: React.Context<null | NotificationCenterContextType>;
      WebFingersContext: React.Context<
        | null
        | UseQueryResult<
            BuildtimeWebFinger | RuntimeWebFinger<Record<string, unknown>>,
            unknown
          >[]
      >;
    };
    shellHooks: ShellTypes['shellHooks'];
    shellAlerts: ShellTypes['shellAlerts'];
  }
}

window.shellHooks = {
  useAuthConfig,
  useAuth,
  useConfigRetriever,
  useDiscoveredViews,
  useShellConfig,
  useLanguage,
  useConfig,
  useLinkOpener: useLinkOpener,
  useDeployedApps: useDeployedApps,
  useShellThemeSelector: useShellThemeSelector,
};

window.shellAlerts = {
  AlertsProvider: AlertProvider,
  hooks: {
    useAlerts: useAlerts,
    useHighestSeverityAlerts: useHighestSeverityAlerts,
  },
  alertSelectors: {
    getPlatformAlertSelectors: getPlatformAlertSelectors,
    getNodesAlertSelectors: getNodesAlertSelectors,
    getVolumesAlertSelectors: getVolumesAlertSelectors,
    getNetworksAlertSelectors: getNetworksAlertSelectors,
    getServicesAlertSelectors: getServicesAlertSelectors,
    getK8SMasterAlertSelectors: getK8SMasterAlertSelectors,
    getBootstrapAlertSelectors: getBootstrapAlertSelectors,
    getMonitoringAlertSelectors: getMonitoringAlertSelectors,
    getAlertingAlertSelectors: getAlertingAlertSelectors,
    getLoggingAlertSelectors: getLoggingAlertSelectors,
    getDashboardingAlertSelectors: getDashboardingAlertSelectors,
    getIngressControllerAlertSelectors: getIngressControllerAlertSelectors,
    getAuthenticationAlertSelectors: getAuthenticationAlertSelectors,
  },
};

function FederatedRoute({
  url,
  scope,
  module,
  app,
  groups,
}: FederatedComponentProps & {
  groups?: string[];
  app: SolutionUI;
}) {
  const { retrieveConfiguration } = useConfigRetriever();
  const { setAuthConfig } = useAuthConfig();
  const { language } = useLanguage();
  useEffect(() => {
    const runtimeAppConfig = retrieveConfiguration<Record<string, unknown>>({
      configType: 'run',
      name: app.name,
    });

    if (runtimeAppConfig) {
      setAuthConfig(runtimeAppConfig.spec.auth);
    }
  }, [retrieveConfiguration]);
  return (
    <ErrorBoundary
      FallbackComponent={() => (
        <ErrorPage500 data-cy="sc-error-page500" locale={language} />
      )}
    >
      <ProtectedFederatedRoute
        url={url}
        scope={scope}
        module={module}
        app={app}
        groups={groups}
      />
    </ErrorBoundary>
  );
}

function ProtectedFederatedRoute({
  url,
  scope,
  module,
  app,
  groups,
}: FederatedComponentProps & {
  groups?: string[];
  app: SolutionUI;
}) {
  const { userData } = useAuth();
  const { retrieveConfiguration } = useConfigRetriever();

  if (
    userData &&
    (groups?.some((group) => userData.groups.includes(group)) ?? true)
  ) {
    const appBuildConfig = retrieveConfiguration<'build'>({
      configType: 'build',
      name: app.name,
    });
    return (
      <FederatedComponent
        url={`${app.url}${appBuildConfig?.spec.remoteEntryPath}?version=${app.version}`}
        module={module}
        props={{}}
        scope={scope}
        app={app}
      />
    );
  }

  return <></>;
}

function InternalRouter() {
  const discoveredViews = useDiscoveredViews();
  const { retrieveConfiguration } = useConfigRetriever();
  const routes = useMemo(
    () =>
      (
        discoveredViews.filter(
          (discoveredView) => discoveredView.isFederated,
        ) as FederatedView[]
      )
        //Sort the exact and strict routes first, to make sure to match the exact first.
        .sort((a, b) => {
          if (a.view.path === '/') {
            return -1;
          }
          if (a.view.exact && !b.view.exact) {
            return -1;
          }
          if (!a.view.exact && b.view.exact) {
            return 1;
          }
          if (a.view.strict && !b.view.strict) {
            return -1;
          }
          if (!a.view.strict && b.view.strict) {
            return 1;
          }
          return 0;
        })

        .map(({ app, view, groups }) => ({
          path: app.appHistoryBasePath + view.path,
          exact: view.exact,
          strict: view.strict,
          sensitive: view.sensitive,
          component: () => {
            const federatedAppHistory = useMemo(
              () =>
                createBrowserHistory({
                  basename: app.appHistoryBasePath,
                }),
              [],
            );
            return (
              <Router history={federatedAppHistory} key={app.name}>
                <FederatedRoute
                  url={
                    app.url +
                    retrieveConfiguration<'build'>({
                      configType: 'build',
                      name: app.name,
                    })?.spec.remoteEntryPath
                  }
                  module={view.module}
                  scope={view.scope}
                  app={app}
                  groups={groups}
                  renderOnLoading={
                    <Loader
                      size="massive"
                      centered={true}
                      aria-label="loading"
                    />
                  }
                />
              </Router>
            );
          },
        })),
    [JSON.stringify(discoveredViews)],
  );
  return (
    <>
      <Switch>
        {routes.map((route) => (
          <Route key={route.path} {...route} />
        ))}
      </Switch>
    </>
  );
}

function InternalApp() {
  const history = useMemo(() => {
    const history = createBrowserHistory({});
    return history;
  }, []);

  const { status } = useQuery({
    queryKey: ['load-share-deps'],
    queryFn: async () => {
      return Promise.all([
        loadShare('react'),
        loadShare('react-dom'),
        loadShare('react-router'),
        loadShare('react-router-dom'),
        loadShare('react-query'),
        loadShare('styled-components'),
        loadShare('@scality/module-federation'),
      ]);
    },
  });

  return (
    <Router history={history}>
      <ShellHistoryProvider>
        <FirstTimeLoginProvider>
          <NotificationCenterProvider>
            {(status === 'idle' || status === 'loading') && (
              <Loader size="massive" centered={true} aria-label="loading" />
            )}
            {status === 'error' && <ErrorPage500 data-cy="sc-error-page500" />}
            {status === 'success' && (
              <SolutionsNavbar>
                <InternalRouter />
              </SolutionsNavbar>
            )}
          </NotificationCenterProvider>
        </FirstTimeLoginProvider>
      </ShellHistoryProvider>
    </Router>
  );
}

export function WithInitFederationProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const { config: shellConfig } = useShellConfig();
  return (
    <UIListProvider discoveryURL={shellConfig.discoveryUrl}>
      <ConfigurationProvider>
        <AuthConfigProvider>
          <AuthProvider>{children}</AuthProvider>
        </AuthConfigProvider>
      </ConfigurationProvider>
    </UIListProvider>
  );
}

const AppProviderWrapper = () => {
  const { language } = useLanguage();
  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => {
        if ('en' in error && 'fr' in error) {
          return (
            <ErrorPage500
              data-cy="sc-error-page500"
              locale={language}
              errorMessage={{ en: error.en, fr: error.fr }}
            />
          );
        }
        if (error instanceof Error) {
          return (
            <ErrorPage500
              data-cy="sc-error-page500"
              locale={language}
              errorMessage={{ en: error.message, fr: error.message }}
            />
          );
        }
        return <ErrorPage500 locale={language} />;
      }}
    >
      <WithInitFederationProviders>
        <InternalApp />
      </WithInitFederationProviders>
    </ErrorBoundary>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient} contextSharing={true}>
      <ShellConfigProvider shellConfigUrl={'/shell/config.json'}>
        <ShellThemeSelectorProvider>
          {(theme) => (
            <CoreUiThemeProvider theme={theme}>
              <ScrollbarWrapper>
                <div
                  style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <LanguageProvider>
                    <ToastProvider>
                      <AppProviderWrapper />
                    </ToastProvider>
                  </LanguageProvider>
                </div>
              </ScrollbarWrapper>
            </CoreUiThemeProvider>
          )}
        </ShellThemeSelectorProvider>
      </ShellConfigProvider>
    </QueryClientProvider>
  );
}
