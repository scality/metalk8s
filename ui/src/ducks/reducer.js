import { combineReducers } from 'redux';

import config from './config';
import nodes from './app/nodes';
import pods from './app/pods';
import volumes from './app/volumes';
import login from './login';
import layout from './app/layout';
import notifications from './app/notifications';
import salt from './app/salt';
import monitoring from './app/monitoring';
import namespaces from './app/namespaces';

const rootReducer = combineReducers({
  config,
  login,
  app: combineReducers({
    nodes,
    layout,
    pods,
    notifications,
    salt,
    monitoring,
    volumes,
    namespaces
  })
});

export default rootReducer;
