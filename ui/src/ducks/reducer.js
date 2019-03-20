import { combineReducers } from 'redux';

import language from './language';
import nodes from './app/nodes';
import login from './login';
import layout from './app/layout';

const rootReducer = combineReducers({
  language,
  login,
  app: combineReducers({
    nodes,
    layout
  })
});

export default rootReducer;
