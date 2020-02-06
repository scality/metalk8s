import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import singleSpaReact from 'single-spa-react';
import { createStore, applyMiddleware, compose } from 'redux';
import { Router } from 'react-router-dom';
import createSagaMiddleware from 'redux-saga';
import './index.css';
import App from './containers/App';
import * as serviceWorker from './serviceWorker';
import reducer from './ducks/reducer';
import sagas from './ducks/sagas';
import history, { setHistoryBaseName } from './history';
import setPublicPath from '../config/setPublicPath';
const composeEnhancers =
  typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;

const sagaMiddleware = createSagaMiddleware();
const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
export const store = createStore(reducer, enhancer);

sagaMiddleware.run(sagas);
setHistoryBaseName('metalK8s');

const rootComponent = props => (
  <Provider store={store}>
    <Router history={history}>
      <App store={store} url="http://localhost:8240/public" microapp={true} />
    </Router>
  </Provider>
);

function domElementGetter() {
  let el = document.getElementById('metalK8s');
  if (!el) {
    el = document.createElement('div');
    el.id = 'metalK8s';
    document.body.appendChild(el);
  }

  return el;
}

const reactLifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent,
  domElementGetter,
});

export const bootstrap = [
  () => {
    return setPublicPath();
  },
  reactLifecycles.bootstrap,
];

export const mount = [reactLifecycles.mount];

export const unmount = [reactLifecycles.unmount];

export const unload = [reactLifecycles.unload];

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
