//@flow
import {
  createContext,
  useContext,
  useState,
  useEffect,
  lazy,
  Suspense,
  type Node,
  useMemo,
} from 'react';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import ErrorPage500 from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import ScrollbarWrapper from '@scality/core-ui/dist/components/scrollbarwrapper/ScrollbarWrapper.component';
import { ThemeProvider as StyledComponentsProvider } from 'styled-components';
import type { Theme } from './navbar/theme';
import { SolutionsNavbar, type Browser } from './navbar';
import { string } from 'prop-types';
import {
  FederatedComponent,
  type FederatedComponentProps,
  type SolutionUI,
} from './ModuleFederation';
import { useAuth as useOidcReactAuth, type AuthContextProps } from 'oidc-react';
import AlertProvider from './alerts/AlertProvider';
import {
  UIListProvider,
  useDeployedApps,
  useDeployedAppsRetriever,
} from './initFederation/UIListProvider';
import {
  ConfigurationProvider,
  useConfigRetriever,
  useDiscoveredViews,
} from './initFederation/ConfigurationProviders';
import { Route, Switch, BrowserRouter } from 'react-router-dom';
import {
  ShellConfigProvider,
  useShellConfig,
  type NavbarEntry,
} from './initFederation/ShellConfigProvider';
import { AuthConfigProvider, useAuthConfig } from './auth/AuthConfigProvider';
import { AuthProvider, useAuth } from './auth/AuthProvider';

export const queryClient: typeof QueryClient = new QueryClient();

function FederatedRoute({
  url,
  scope,
  module,
  app,
  groups,
}: FederatedComponentProps & {
  groups?: string[],
  app: SolutionUI,
}): Node {
  const { retrieveConfiguration } = useConfigRetriever();
  const { setAuthConfig } = useAuthConfig();

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
    <ProtectedFederatedRoute
      url={url}
      scope={scope}
      module={module}
      app={app}
      groups={groups}
    />
  );
}

function ProtectedFederatedRoute({
  url,
  scope,
  module,
  app,
  groups,
}: FederatedComponentProps & {
  groups?: string[],
  app: SolutionUI,
}): Node {
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
        url={app.url + appBuildConfig.spec.remoteEntryPath}
        module={module}
        scope={scope}
        app={app}
      />
    );
  }
  return <></>;
}

function InternalApp(): Node {
  const navbarConfigUrl = '/shell/config.json'; // TODO find a way to inject this
  const [federatedComponent, setFederatedComponent] =
    useState<FederatedComponentProps | null>(null);

  const discoveredViews = useDiscoveredViews();
  const {retrieveConfiguration} = useConfigRetriever();

  const routes = discoveredViews
    .filter((discoveredView) => discoveredView.isFederated)
    .map(({ app, view, groups }) => ({
      path: app.appHistoryBasePath + view.path,
      exact: view.exact,
      strict: view.strict,
      sensitive: view.sensitive,
      component: () => (
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
      ),
    }));

  return (
    <BrowserRouter>
      <SolutionsNavbar>
        <Switch>
          {routes.map((route) => (
            <Route key={route.path} {...route} />
          ))}
        </Switch>
      </SolutionsNavbar>
    </BrowserRouter>
  );
}

function WithInitFederationProviders({ children }: { children: Node }) {
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

export default function App(): Node {
  return (
    <ScrollbarWrapper>
      <QueryClientProvider client={queryClient}>
        <ShellConfigProvider shellConfigUrl={'/shell/config.json'}>
          <WithInitFederationProviders>
            <InternalApp />
          </WithInitFederationProviders>
        </ShellConfigProvider>
      </QueryClientProvider>
    </ScrollbarWrapper>
  );
}
