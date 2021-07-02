import 'regenerator-runtime/runtime';
import React, { useMemo } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import { Router } from 'react-router-dom';
import createSagaMiddleware from 'redux-saga';
import App from './containers/App';
import reducer from './ducks/reducer';
import sagas from './ducks/sagas';
import { createBrowserHistory } from 'history';
import { useTypedSelector } from './hooks';
import { setHistory as setReduxHistory } from './ducks/history';
import { ErrorPage500 } from '@scality/core-ui';

const composeEnhancers =
  typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;

const sagaMiddleware = createSagaMiddleware();
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

function WithShell({children}) {
    return <>{children}</>
}

export default function FederableApp() {
  return (
    <WithShell>
        <Provider store={store}>
        <RouterWithBaseName>
            <App />
        </RouterWithBaseName>
        </Provider>
    </WithShell>
  );
}
