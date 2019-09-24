import { combineReducers } from 'redux';

import config from './config';
import login from './login';
import layout from './app/layout';
import clockServer from './app/clockServer';
import versionServer from './app/versionServer';
import namespaces from './app/namespaces';
import notifications from './app/notifications';
import deployments from './app/deployment';
import stack from './app/stack';

const rootReducer = combineReducers({
  config,
  login,
  app: combineReducers({
    layout,
    clockServer,
    versionServer,
    namespaces,
    notifications,
    deployments,
    stack
  })
});

export default rootReducer;
