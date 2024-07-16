import 'regenerator-runtime/runtime';
import { PropsWithChildren, ReactNode, useEffect, useMemo } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { createStore, applyMiddleware, compose, Store } from 'redux';
import { Router } from 'react-router-dom';
import createSagaMiddleware from 'redux-saga';
import { useCurrentApp } from '@scality/module-federation';
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
export const store: Store = createStore(reducer, enhancer);
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
type Config = {
  url: string;
  url_salt: string;
  url_prometheus: string;
  url_grafana: string;
  url_doc: string;
  url_alertmanager: string;
  url_loki: string;
  flags?: string[];
  ui_base_path?: string;
  url_support?: string;
};
export const useConfig = () => {
  const { name } = useCurrentApp();
  const runtimeConfiguration = window.shellHooks.useConfig<Config>({
    configType: 'run',
    name,
  });

  return runtimeConfiguration.spec.selfConfiguration;
};

function InternalAppConfigProvider({ children }) {
  const dispatch = useDispatch();
  const { status, api } = useTypedSelector((state) => state.config);
  const config = useConfig();
  useEffect(() => {
    if (status === 'idle') {
      dispatch(setApiConfigAction(config));
    } // eslint-disable-next-line
  }, [status]);

  if (api && status === 'success') {
    return <>{children}</>;
  } else if (status === 'loading' || status === 'idle') {
    return <Loader size="massive" centered={true} aria-label="loading" />; // TODO display the previous module while lazy loading the new one
  } else if (status === 'error') {
    return <ErrorPage500 data-cy="sc-error-page500" />;
  }
}

export function AppConfigProviderWithoutRedux({ children }) {
  return <>{children}</>;
}

export const AppConfigProvider = ({
  children,
  componentWithInjectedImports,
}: PropsWithChildren<{ componentWithInjectedImports?: ReactNode }>) => {
  if (!componentWithInjectedImports) {
    return <InternalAppConfigProvider>{children}</InternalAppConfigProvider>;
  }
  return (
    //@ts-expect-error
    <componentWithInjectedImports>{children}</componentWithInjectedImports>
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
