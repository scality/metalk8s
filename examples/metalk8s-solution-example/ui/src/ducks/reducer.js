import { combineReducers } from 'redux';

import config from './config';
import login from './login';
import layout from './app/layout';
import notifications from './app/notifications';
import environment from './app/environment';

const rootReducer = combineReducers({
  config,
  login,
  app: combineReducers({
    layout,
    notifications,
    environment
  })
});

export default rootReducer;
