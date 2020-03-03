import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import { Router } from 'react-router-dom';
import createSagaMiddleware from 'redux-saga';
import './index.css';
import * as serviceWorker from './serviceWorker';
// import reducer from './ducks/reducer';
// import sagas from './ducks/sagas';
import history from './history';
import MicroApp from './containers/MicroApp';

const sagaMiddleware = createSagaMiddleware();

const configureStore = () => {
  const initialState = {};
  const initialReducer = (state = initialState) => state;

  const composeEnhancers =
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const store = createStore(
    initialReducer,
    composeEnhancers(applyMiddleware(sagaMiddleware)),
  );

  const createReducer = asyncReducers => {
    return combineReducers({
      initialReducer,
      ...asyncReducers,
    });
  };

  // Add a dictionary to keep track of the registered async reducers
  store.asyncReducers = {};
  // Create an inject reducer function
  // This function adds the async reducer, and creates a new combined reducer
  store.injectReducer = (key, asyncReducer) => {
    store.asyncReducers[key] = asyncReducer;
    store.replaceReducer(createReducer(store.asyncReducers));
  };

  store.runSaga = sagaMiddleware.run;

  return store;
};

export const store = configureStore();

ReactDOM.render(
  <Provider store={store}>
    <Router history={history}>
      <MicroApp store={store} namespace="metalk8s" />
    </Router>
  </Provider>,
  document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
