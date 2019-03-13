import { combineReducers } from 'redux';

import language from './language';
import nodes from './nodes';
import login from './login';

const rootReducer = combineReducers({
  language,
  login,
  nodes
});

export default rootReducer;
