import { combineReducers } from 'redux';

import config from './config';
import login from './login';
import layout from './app/layout';
import customResource from './app/customResource';
import namespaces from './app/namespaces';
import notifications from './app/notifications';
import deployments from './app/deployment';

const rootReducer = combineReducers({
  config,
  login,
  app: combineReducers({
    layout,
    customResource,
    namespaces,
    notifications,
    deployments
  })
});

export default rootReducer;
