import 'regenerator-runtime/runtime';
import React, { useEffect, useMemo } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import { Router } from 'react-router-dom';
import createSagaMiddleware from 'redux-saga';
import {
  ComponentWithFederatedImports,
  useCurrentApp,
} from '@scality/module-federation';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';
import ErrorPage500 from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import App from './containers/App';
import reducer from './ducks/reducer';
import sagas from './ducks/sagas';
import { createBrowserHistory } from 'history';
import { useTypedSelector } from './hooks';
import { setHistory as setReduxHistory } from './ducks/history';
import { setApiConfigAction } from './ducks/config';
import { initToggleSideBarAction } from './ducks/app/layout';
import { authErrorAction } from './ducks/app/authError';
import { AuthError } from './services/errorhandler';

const composeEnhancers =
  typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
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

if (window.Cypress) window.__store__ = store;

sagaMiddleware.run(sagas);

const RouterWithBaseName = ({ children }) => {
  const configStatus = useTypedSelector((state) => state.config.status);
  const basename = useTypedSelector((state) => state.config.api?.ui_base_path);
  const dispatch = useDispatch();
  const history = useMemo(() => {
    let history = createBrowserHistory({});
    if (basename) {
      const historyWithBasename = createBrowserHistory({ basename });
      history = historyWithBasename;
      dispatch(setReduxHistory(historyWithBasename));
    } else {
      dispatch(setReduxHistory(history));
    }
    if (window.Cypress) window.__history__ = history;

    return history;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

function InternalAppConfigProvider({ children, moduleExports }) {
  const dispatch = useDispatch();
  const { name } = useCurrentApp();
  const { status, api } = useTypedSelector((state) => state.config);

  const runtimeConfiguration = moduleExports[
    './moduleFederation/ConfigurationProvider'
  ].useConfig({ configType: 'run', name });

  useEffect(() => {
    if (status === 'idle') {
      dispatch(setApiConfigAction(runtimeConfiguration.spec.selfConfiguration));
      dispatch(initToggleSideBarAction());
    }
    // eslint-disable-next-line
  }, [status]);
  if (api && status === 'success') {
    return <>{children}</>;
  } else if (status === 'loading' || status === 'idle') {
    return <Loader size="massive" centered={true} aria-label="loading" />; // TODO display the previous module while lazy loading the new one
  } else if (status === 'error') {
    return <ErrorPage500 data-cy="sc-error-page500" />;
  }
}

const AppConfigProvider = ({ children }) => {
  return (
    <ComponentWithFederatedImports
      componentWithInjectedImports={InternalAppConfigProvider}
      renderOnError={<ErrorPage500 />}
      componentProps={{ children }}
      federatedImports={[
        {
          scope: 'shell',
          module: './moduleFederation/ConfigurationProvider',
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
        <RouterWithBaseName>
          <App />
        </RouterWithBaseName>
      </AppConfigProvider>
    </Provider>
  );
}
