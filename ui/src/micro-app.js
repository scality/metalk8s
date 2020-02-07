import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
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
setHistoryBaseName('metalk8s');

const rootComponent = props => (
  <Provider store={store}>
    <Router history={history}>
      <App store={store} url="http://localhost:8240/public" microapp={true} />
    </Router>
  </Provider>
);

export default rootComponent;

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
