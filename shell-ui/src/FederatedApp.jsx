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
  navbarEntry,
}: FederatedComponentProps & {
  navbarEntry: NavbarEntry,
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
      navbarEntry={navbarEntry}
    />
  );
}

function ProtectedFederatedRoute({
  url,
  scope,
  module,
  app,
  navbarEntry,
}: FederatedComponentProps & {
  navbarEntry: NavbarEntry,
  app: SolutionUI,
}): Node {
  const { userData } = useAuth();
  const { retrieveConfiguration } = useConfigRetriever();

  if (
    userData &&
    (navbarEntry.groups?.some((group) => userData.groups.includes(group)) ??
      true)
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
  const { retrieveConfiguration } = useConfigRetriever();
  const { retrieveDeployedApps } = useDeployedAppsRetriever();
  const { config: shellConfig } = useShellConfig();
  const deployedApps = retrieveDeployedApps();

  const routes = [
    ...shellConfig.navbar.main,
    ...shellConfig.navbar.subLogin,
  ].flatMap((navbarEntry) => {
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
          path: app.appHistoryBasePath + view.path,
          exact: view.exact,
          strict: view.strict,
          sensitive: view.sensitive,
          component: () => (
            <FederatedRoute
              url={app.url + appBuildConfig.spec.remoteEntryPath}
              module={view.module}
              scope={view.scope}
              app={app}
              navbarEntry={navbarEntry}
            />
          ),
        },
      ];
    }

    return [];
  });

  const federatedBrowser: Browser = {
    open: ({ name, view }) => {
      const buildConfig = retrieveConfiguration({ configType: 'build', name });
      const runConfig = retrieveConfiguration({ configType: 'run', name });
      const matchingApps = retrieveDeployedApps({ name });
      if (
        buildConfig &&
        buildConfig.spec.views &&
        buildConfig.spec.views[view] &&
        matchingApps &&
        matchingApps.length > 0
      ) {
        setFederatedComponent({
          module: buildConfig.spec.views[view].module,
          scope: buildConfig.spec.views[view].scope,
          url: matchingApps[0].url + buildConfig.spec.remoteEntryPath,
        });
        window.history.pushState(
          {},
          runConfig?.spec.title || null,
          matchingApps[0].appHistoryBasePath +
            buildConfig.spec.views[view].path,
        );
      }
    },
  };

  return (
    <SolutionsNavbar federatedBrowser={federatedBrowser}>
      <BrowserRouter>
        <Switch>
          {routes.map((route) => (
            <Route key={route.path} {...route} />
          ))}
        </Switch>
      </BrowserRouter>
    </SolutionsNavbar>
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
