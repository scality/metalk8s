import {
  USER_FOUND,
  LOADING_USER,
  LOAD_USER_ERROR,
  USER_EXPIRED,
  SILENT_RENEW_ERROR,
  USER_EXPIRING,
  SESSION_TERMINATED,
  USER_SIGNED_OUT,
} from 'redux-oidc';

// a currying function that turns the given namespace and the given reducer turn into a namespaced reducer
const namespaceReducerFactory = (namespace, reducerFunction) => (
  state,
  action,
) => {
  const isInitializationCall = state === undefined;
  const reduxOidcActions = [
    USER_FOUND,
    LOADING_USER,
    LOAD_USER_ERROR,
    USER_EXPIRED,
    SILENT_RENEW_ERROR,
    USER_EXPIRING,
    SESSION_TERMINATED,
    USER_SIGNED_OUT,
  ];
  if (action && reduxOidcActions.includes(action.type)) {
    return reducerFunction(state, action);
  }
  if ((action && action.namespace) !== namespace && !isInitializationCall)
    return state;
  return reducerFunction(state, action);
};

// a currying function that turns a given namespace into a namespaced action creator
const namespaceActionFactory = namespace => (actionCreator, ...actionArgs) => {
  const action = actionCreator(...actionArgs);
  return { ...action, namespace };
};

// when we dispatch the action, we will do it in this way nameSpaceAction
// `nameSpaceAction(actionCreator,...actionArgs)`
let nameSpaceAction = namespaceActionFactory();

const setActionCreatorNamespace = newNamespace => {
  nameSpaceAction = namespaceActionFactory(newNamespace);
};

const namespaceSelectorFactory = namespace => state => state[namespace] || {};
const setSelectorNamespace = newNamespace => {
  appNamespaceSelector = namespaceSelectorFactory(newNamespace);
};
// Instead of useSelector(state => state.app) -> useSelector(appNamespaceSelector(state => state.app))
// Initialise by appNamespaceSelector()
let appNamespaceSelector = namespaceSelectorFactory();

export {
  nameSpaceAction,
  appNamespaceSelector,
  setSelectorNamespace,
  setActionCreatorNamespace,
  namespaceReducerFactory,
};

// How to use appNamespaceSelector?
// Previously, we use select function in this way: `yield.select(selector)`
// Now, we manually add a appNamespaceSelector function which take the state.metalk8s as arguments instead of state
// `const expanded = yield select(state =>
// isSidebarExpandedSelector(appNamespaceSelector(state))`
