import 'regenerator-runtime/runtime';
import React, {
  PropsWithChildren,
  ReactNode,
  createContext,
  useEffect,
  useMemo,
} from 'react';
import { Provider, useDispatch } from 'react-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import { Router } from 'react-router-dom';
import createSagaMiddleware from 'redux-saga';
import {
  ComponentWithFederatedImports,
  useCurrentApp,
} from '@scality/module-federation';
import { Loader, ToastProvider } from '@scality/core-ui';
import { ErrorPage500 } from '@scality/core-ui';
import App from './containers/App';
import reducer from './ducks/reducer';
import sagas from './ducks/sagas';
import { createBrowserHistory } from 'history';
import { useTypedSelector } from './hooks';
import { setHistory as setReduxHistory } from './ducks/history';
import { setApiConfigAction } from './ducks/config';
import { authErrorAction } from './ducks/app/authError';
import { AuthError } from './services/errorhandler';
import { Config } from './services/api';
const composeEnhancers =
  // @ts-expect-error - FIXME when you are working on it
  typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? // @ts-expect-error - FIXME when you are working on it
      window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;
const sagaMiddleware = createSagaMiddleware({
  onError: (error) => {
    if (error instanceof AuthError) {
      store.dispatch(authErrorAction());
    }
  },
});
const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
export const store = createStore(reducer, enhancer);
// @ts-expect-error - FIXME when you are working on it
if (window.Cypress) window.__store__ = store;
sagaMiddleware.run(sagas);

const RouterWithBaseName = ({ children }) => {
  const configStatus = useTypedSelector((state) => state.config.status);
  const basename = useTypedSelector((state) => state.config.api?.ui_base_path);
  const dispatch = useDispatch();
  const history = useMemo(() => {
    let history = createBrowserHistory({});

    if (basename) {
      const historyWithBasename = createBrowserHistory({
        basename,
      });
      history = historyWithBasename;
      // @ts-expect-error - FIXME when you are working on it
      dispatch(setReduxHistory(historyWithBasename));
    } else {
      // @ts-expect-error - FIXME when you are working on it
      dispatch(setReduxHistory(history));
    }

    // @ts-expect-error - FIXME when you are working on it
    if (window.Cypress) window.__history__ = history;
    return history; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basename]);

  if (configStatus === 'error') {
    return <ErrorPage500 data-cy="sc-error-page500" />;
  }

  if (configStatus === 'idle' || configStatus === 'loading') {
    return <>{children}</>;
  }

  return (
    <Router key={basename} history={history}>
      {children}
    </Router>
  );
};

export const ConfigContext = createContext<Config | null>(null);

export const useConfig = () => {
  const context = React.useContext(ConfigContext);
  if (context === null) {
    throw new Error('useConfig must be used within AppConfigProvider');
  }
  return context;
};

function InternalAppConfigProvider({ children, moduleExports }) {
  const dispatch = useDispatch();
  const { name } = useCurrentApp();
  const { status, api } = useTypedSelector((state) => state.config);
  const runtimeConfiguration = moduleExports[
    './moduleFederation/ConfigurationProvider'
  ].useConfig({
    configType: 'run',
    name,
  });
  useEffect(() => {
    if (status === 'idle') {
      dispatch(setApiConfigAction(runtimeConfiguration.spec.selfConfiguration));
    } // eslint-disable-next-line
  }, [status]);

  if (api && status === 'success') {
    return (
      <ConfigContext.Provider
        value={runtimeConfiguration.spec.selfConfiguration}
      >
        {children}
      </ConfigContext.Provider>
    );
  } else if (status === 'loading' || status === 'idle') {
    return <Loader size="massive" centered={true} aria-label="loading" />; // TODO display the previous module while lazy loading the new one
  } else if (status === 'error') {
    return <ErrorPage500 data-cy="sc-error-page500" />;
  }
}

export function AppConfigProviderWithoutRedux({ children, moduleExports }) {
  const { name } = useCurrentApp();

  const runtimeConfiguration = moduleExports[
    './moduleFederation/ConfigurationProvider'
  ].useConfig({
    configType: 'run',
    name,
  });

  return (
    <ConfigContext.Provider value={runtimeConfiguration.spec.selfConfiguration}>
      {children}
    </ConfigContext.Provider>
  );
}

export const AppConfigProvider = ({
  children,
  componentWithInjectedImports,
}: PropsWithChildren<{ componentWithInjectedImports?: ReactNode }>) => {
  if (!componentWithInjectedImports) {
    componentWithInjectedImports = InternalAppConfigProvider;
  }
  return (
    <ComponentWithFederatedImports
      componentWithInjectedImports={componentWithInjectedImports}
      renderOnError={<ErrorPage500 data-cy="sc-error-page500" />}
      componentProps={{
        children,
      }}
      federatedImports={[
        {
          scope: 'shell',
          module: './moduleFederation/ConfigurationProvider',
          // @ts-expect-error - FIXME when you are working on it
          remoteEntryUrl: window.shellUIRemoteEntryUrl,
        },
      ]}
    />
  );
};

export default function FederableApp() {
  return (
    <Provider store={store}>
      <AppConfigProvider>
        <ToastProvider>
          <RouterWithBaseName>
            <App />
          </RouterWithBaseName>
        </ToastProvider>
      </AppConfigProvider>
    </Provider>
  );
}
