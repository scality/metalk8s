import { CoreUiThemeProvider } from '@scality/core-ui/dist/components/coreuithemeprovider/CoreUiThemeProvider';
import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { ScrollbarWrapper } from '@scality/core-ui/dist/components/scrollbarwrapper/ScrollbarWrapper.component';
import { ToastProvider } from '@scality/core-ui/dist/components/toast/ToastProvider';
import {
  FederatedComponent,
  FederatedComponentProps,
  SolutionUI,
} from '@scality/module-federation';
import React, { useEffect, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient } from 'react-query';
import { BrowserRouter, Route, Routes } from 'react-router';

import { loadShare } from '@module-federation/enhanced/runtime';
import { useQuery } from 'react-query';
import { AuthConfigProvider, useAuthConfig } from './auth/AuthConfigProvider';
import { AuthProvider } from './auth/AuthProvider';
import { FirstTimeLoginProvider } from './auth/FirstTimeLoginProvider';
import {
  ShellAlerts,
  shellAlerts,
  ShellHooks,
  shellHooks,
} from './hooks/useShellHooks';
import './index.css';
import {
  ConfigurationProvider,
  useConfigRetriever,
  useFederatedRoutes,
} from './initFederation/ConfigurationProviders';
import {
  ShellConfigProvider,
  useShellConfig,
} from './initFederation/ShellConfigProvider';
import { ShellHistoryProvider } from './initFederation/ShellHistoryProvider';
import { ShellThemeSelectorProvider } from './initFederation/ShellThemeSelectorProvider';
import { UIListProvider } from './initFederation/UIListProvider';
import { SolutionsNavbar } from './navbar';
import { LanguageProvider, useLanguage } from './navbar/lang';
import NotificationCenterProvider from './NotificationCenterProvider';
import { QueryClientProvider } from './QueryClientProvider';

/**
 * This is a mock function to replace the real loadShare function when running tests.
 *
 * jest.mock('@module-federation/enhanced/runtime', () => {}, { virtual: true });
 * in SetupTests.tsx will mock the module for @scality/module-federation
 *
 * However, this does not work when we use it in directly in our code.
 * Since this is only an issue during the test, we check if we are in a test environment
 * and replace the function with a mock function at runtime.
 */
const mockLoadShare: typeof loadShare = () => {
  return Promise.resolve(false);
};
const loadShareModule =
  process.env.NODE_ENV === 'test' ? mockLoadShare : loadShare;

export const queryClient = new QueryClient();

export type FederatedAppProps = {
  shellHooks: ShellHooks;
  shellAlerts: ShellAlerts;
};

type FederatedRouteProps = Pick<FederatedComponentProps, 'scope' | 'module'> & {
  app: SolutionUI;
};
function FederatedRoute({ scope, module, app }: FederatedRouteProps) {
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

  const federatedAppProps: FederatedAppProps = {
    shellHooks,
    shellAlerts,
  };

  const appBuildConfig = retrieveConfiguration<'build'>({
    configType: 'build',
    name: app.name,
  });

  return (
    <ErrorBoundary
      FallbackComponent={() => (
        <ErrorPage500 data-cy="sc-error-page500" locale={language} />
      )}
    >
      <FederatedComponent
        url={`${app.url}${appBuildConfig?.spec.remoteEntryPath}?version=${app.version}`}
        module={module}
        props={federatedAppProps}
        scope={scope}
        app={app}
      />
    </ErrorBoundary>
  );
}

function InternalRouter() {
  const federatedRoutes = useFederatedRoutes();

  const routes = useMemo(
    () =>
      //Sort the exact and strict routes first, to make sure to match the exact first.
      federatedRoutes
        .toSorted((a, b) => {
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
          if (a.view.path === '/') {
            return -1;
          }
          return 0;
        })
        .map(({ app, view }) => ({
          path: app.appHistoryBasePath + view.path,
          basename: app.appHistoryBasePath,
          sensitive: view.sensitive,
          element: (
            <FederatedRoute module={view.module} scope={view.scope} app={app} />
          ),
        })),
    [JSON.stringify(federatedRoutes)],
  );

  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={`${route.basename}/*`}
          element={route.element}
        />
      ))}
    </Routes>
  );
}

function InternalApp() {
  const { status } = useQuery({
    queryKey: ['load-share-deps'],
    queryFn: async () => {
      return Promise.all([
        loadShareModule('react'),
        loadShareModule('react-dom'),
        loadShareModule('react-router'),
        loadShareModule('react-router-dom'),
        loadShareModule('react-query'),
        loadShareModule('styled-components'),
        loadShareModule('@scality/module-federation'),
      ]);
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return (
    <BrowserRouter>
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
    </BrowserRouter>
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
          if (error.message.includes('AbortError: The operation was aborted')) {
            return (
              <>
                Loading of the application has been aborted due to a redirection
                in progress.
              </>
            );
          }
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
