import { routerReducer } from "react-router-redux";
import { combineReducers } from "redux";
import { reducer as oidcReducer } from "redux-oidc";

const reducer = combineReducers({
  routing: routerReducer,
  oidc: oidcReducer
});

export default reducer;
