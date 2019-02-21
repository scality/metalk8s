import { createStore, applyMiddleware, compose } from "redux";
import { connectRouter, routerMiddleware } from "connected-react-router";
import createHistory from "history/createBrowserHistory";
import { loadUser } from "redux-oidc";
import reducer from "./reducer";
import userManager from "./utils/userManager";

export const history = createHistory();

const initialState = {};
const enhancers = [];

// create the middleware with the userManager
//const oidcMiddleware = createOidcMiddleware(userManager);
const middleware = [routerMiddleware(history)];

const composedEnhancers = compose(
  applyMiddleware(...middleware),
  ...enhancers
);

const store = createStore(
  connectRouter(history)(reducer),
  initialState,
  composedEnhancers
);

loadUser(store, userManager);

export default store;
