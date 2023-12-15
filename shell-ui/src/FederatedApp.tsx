import '@fortawesome/fontawesome-free/css/all.css';
import React from 'react';
import { useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { ScrollbarWrapper } from '@scality/core-ui/dist/components/scrollbarwrapper/ScrollbarWrapper.component';
import { SolutionsNavbar } from './navbar';
import type {
  FederatedComponentProps,
  SolutionUI,
} from '@scality/module-federation';
import { FederatedComponent } from '@scality/module-federation';
import { UIListProvider } from './initFederation/UIListProvider';
import {
  ConfigurationProvider,
  useConfigRetriever,
  useDiscoveredViews,
} from './initFederation/ConfigurationProviders';
import { Route, Switch, Router } from 'react-router-dom';
import {
  ShellConfigProvider,
  useShellConfig,
} from './initFederation/ShellConfigProvider';
import { AuthConfigProvider, useAuthConfig } from './auth/AuthConfigProvider';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { createBrowserHistory } from 'history';
import { ErrorBoundary } from 'react-error-boundary';
import { LanguageProvider, useLanguage } from './navbar/lang';
import './index.css';
import { ShellHistoryProvider } from './initFederation/ShellHistoryProvider';
import { CoreUiThemeProvider } from '@scality/core-ui/dist/components/coreuithemeprovider/CoreUiThemeProvider';
import {
  ShellThemeSelectorProvider,
  useShellThemeSelector,
} from './initFederation/ShellThemeSelectorProvider';
import NotificationCenterProvider from './NotificationCenterProvider';
import { FirstTimeLoginProvider } from './auth/FirstTimeLoginProvider';

export const queryClient = new QueryClient();

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
    const runtimeAppConfig = retrieveConfiguration({
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
    const appBuildConfig = retrieveConfiguration({
      configType: 'build',
      name: app.name,
    });
    return (
      <FederatedComponent
        url={`${app.url}${appBuildConfig.spec.remoteEntryPath}?version=${app.version}`}
        module={module}
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
      discoveredViews
        .filter((discoveredView) => discoveredView.isFederated)
        //Sort the exact and strict routes first, to make sure to match the exact first.
        .sort((a, b) => {
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
              <Router history={federatedAppHistory}>
                <FederatedRoute
                  url={
                    app.url +
                    retrieveConfiguration({
                      configType: 'build',
                      name: app.name,
                    }).spec.remoteEntryPath
                  }
                  module={view.module}
                  scope={view.scope}
                  app={app}
                  groups={groups}
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
  return (
    <Router history={history}>
      <ShellHistoryProvider>
        <FirstTimeLoginProvider>
          <NotificationCenterProvider>
            <SolutionsNavbar>
              <InternalRouter />
            </SolutionsNavbar>
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
  const { assets } = useShellThemeSelector();
  console.log('assets', assets);
  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => {
        if ('en' in error && 'fr' in error) {
          return (
            <ErrorPage500
              locale={language}
              errorMessage={{ en: error.en, fr: error.fr }}
            />
          );
        }
        if (error instanceof Error) {
          return (
            <ErrorPage500
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
                    <AppProviderWrapper />
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
