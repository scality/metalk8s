import { combineReducers } from 'redux';

import config from './config';
import nodes from './app/nodes';
import login from './login';
import layout from './app/layout';

const rootReducer = combineReducers({
  config,
  login,
  app: combineReducers({
    nodes,
    layout
  })
});

export default rootReducer;
