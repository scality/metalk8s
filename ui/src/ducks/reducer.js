import { combineReducers } from 'redux';

import language from './language';
import users from './users';

const rootReducer = combineReducers({
  language,
  users
});

export default rootReducer;
