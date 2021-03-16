import React, { useLayoutEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Provider, useDispatch } from 'react-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import { Router } from 'react-router-dom';
import createSagaMiddleware from 'redux-saga';
import './index.css';
import App from './containers/App';
import * as serviceWorker from './serviceWorker';
import reducer from './ducks/reducer';
import sagas from './ducks/sagas';
import { createBrowserHistory } from 'history';
import { useTypedSelector } from './hooks';
import { setHistory as setReduxHistory } from './ducks/history';

const composeEnhancers =
  typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;

const sagaMiddleware = createSagaMiddleware();
const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
export const store = createStore(reducer, enhancer);

if (window.Cypress) window.__store__ = store;

sagaMiddleware.run(sagas);

const RouterWithBaseName = ({children}) => {
  const configStatus = useTypedSelector(state => state.config.status);
  const basename = useTypedSelector(state => state.config.api?.ui_base_path);
  const [history, setHistory] = useState(createBrowserHistory({}));
  const dispatch = useDispatch();
  useLayoutEffect(() =>{
    if (basename) {
      const historyWithBasename = createBrowserHistory({basename});
      setHistory(historyWithBasename);
      if (window.Cypress) window.__history__ = historyWithBasename;
      dispatch(setReduxHistory(historyWithBasename));
    }
    if (window.Cypress) window.__history__ = history;
  }, [basename]);
 
  if (configStatus === 'error') {
    return <>An error occurred, please try to refresh the page</>//Todo display an error page
  }

  if (configStatus === 'idle' || configStatus === 'loading') {
    return <>{children}</>
  }

  return <Router key={basename} history={history}>{children}</Router>
}

ReactDOM.render(
  <Provider store={store}>
    <RouterWithBaseName>
      <App />
    </RouterWithBaseName>
  </Provider>,
  document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
