import { combineReducers } from 'redux';

import config from './config';
import nodes from './app/nodes';
import pods from './app/pods';
import login from './login';
import layout from './app/layout';
import notifications from './app/notifications';
import salt from './app/salt';
import monitoring from './app/monitoring';

const rootReducer = combineReducers({
  config,
  login,
  app: combineReducers({
    nodes,
    layout,
    pods,
    notifications,
    salt,
    monitoring
  })
});

export default rootReducer;
