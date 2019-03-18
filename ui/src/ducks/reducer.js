import { combineReducers } from 'redux';

import language from './language';
import nodes from './nodes';
import login from './login';
import app from './app';

const rootReducer = combineReducers({
  language,
  login,
  nodes,
  app
});

export default rootReducer;
