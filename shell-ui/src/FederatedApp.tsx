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
import React, { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient } from 'react-query';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router';

import {
  loadShare,
  createInstance,
} from '@module-federation/enhanced/runtime';
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
import { createRemoteAppComponent } from '@module-federation/bridge-react';
import BridgeReactPlugin from '@module-federation/bridge-react/plugin';
import { configurationStore, useConfigurationStoreState } from './services/ConfigurationService/store';

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
const CreateRemoteAppComponent = (
  mf: any,
  scope: string,
  module: string,
  url: string,
  fallback = () => <div>Error loading</div>,
  loading = <div>Loading...</div>,
) => {
  mf.registerRemotes([{ name: scope, entry: url }]);
  const Component = createRemoteAppComponent({
    loader: () => mf.loadRemote(`${scope}/${module}`),
    fallback,
    loading,
  });
  return Component;
};

const mf = createInstance({
  name: 'federation_consumer',
  remotes: [],
  plugins: [BridgeReactPlugin()],
});

const InternalRouter2 = () => {
  const Component = CreateRemoteAppComponent(
    mf,
    'metalk8s',
    'ExportApp',
    'http://localhost:3000/metalk8s/mf-manifest.json?hehe',
  );
  const Component2 = CreateRemoteAppComponent(
    mf,
    'zenko',
    'ExportApp',
    'http://localhost:8383/zenko/mf-manifest.json',
  );
  const metalk8sConfig = shellHooks.useConfig({
    configType: 'run',
    name: 'metalk8s.eu-west-1',
  });
  const dataConfig = shellHooks.useConfig({
    configType: 'run',
    name: 'zenko.eu-west-1',
  });


  const { retrieveConfiguration } = useConfigRetriever();
  const { setAuthConfig } = useAuthConfig();

  useEffect(() => {
    const runtimeAppConfig = retrieveConfiguration<Record<string, unknown>>({
      configType: 'run',
      name: "metalk8s.eu-west-1",
    });
    // metalk8sConfig and runtimeAppConfig are the same but retrieveConfiguration type it correctly

    if (runtimeAppConfig) {
      setAuthConfig(runtimeAppConfig.spec.auth);
    }
  }, [retrieveConfiguration]);

  const navigate = useNavigate();
  return (
    <Routes>
      <Route path="/platform/*" element={
        <Component basename="/platform" config={metalk8sConfig} store={configurationStore} queryClient={queryClient} />}
      />
      <Route path="/data/*" element={
        <Component2 basename="/data" config={dataConfig} store={configurationStore} queryClient={queryClient} shellNavigate={navigate} />}
      />
    </Routes>
  );
};

const ShellTestApp = () => {
  const { counter, incrementCounter, decrementCounter, resetCounter } = useConfigurationStoreState();
  const [enabled, setEnabled] = useState(false);
  const { data } = useQuery({
    queryKey: ['shell-test-app'],
    queryFn: () => {
      return Promise.resolve("shell-test-app");
    },
    enabled: enabled,
    cacheTime: Infinity,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid red', padding: '10px' }}>
      ShellTestApp
      <button type="button" onClick={() => {
        setEnabled(true);
      }}>Enable Query</button>
      <div>Query Data: {data ?? "No data"}</div>
      <button type="button" onClick={() => {
        incrementCounter();
      }}>Shell Click me {counter}</button>
    </div>
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
  // const { status } = useQuery({
  //   queryKey: ['load-share-deps'],
  //   queryFn: async () => {
  //     return Promise.all([
  //       loadShareModule('react'),
  //       loadShareModule('react-dom'),
  //       loadShareModule('react-router'),
  //       loadShareModule('react-router-dom'),
  //       loadShareModule('react-query'),
  //       loadShareModule('styled-components'),
  //       loadShareModule('@scality/module-federation'),
  //       // loadShareModule('@module-federation/bridge-react'),
  //     ]);
  //   },
  //   refetchOnWindowFocus: false,
  //   refetchOnMount: false,
  //   refetchOnReconnect: false,
  // });

  return (
    <BrowserRouter>
      <ShellHistoryProvider>
        <FirstTimeLoginProvider>
          <NotificationCenterProvider>
            {/* {(status === 'idle' || status === 'loading') && (
              <Loader size="massive" centered={true} aria-label="loading" />
            )}
            {status === 'error' && <ErrorPage500 data-cy="sc-error-page500" />} */}
            {/* {status === 'success' && ( */}
            <SolutionsNavbar>
              <ShellTestApp />
              <InternalRouter2 />
            </SolutionsNavbar>
            {/* )} */}
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
  console.log('DEBUG AppProviderWrapper');
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
