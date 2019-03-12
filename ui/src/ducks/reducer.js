import { combineReducers } from 'redux';

import language from './language';
import users from './users';
import login from './login';

const rootReducer = combineReducers({
  language,
  login,
  users
});

export default rootReducer;
