// a currying function that turns the given namespace and the given reducer turn into a namespaced reducer
const namespaceReducerFactory = (namespace, reducerFunction) => (
  state,
  action
) => {
  const isInitializationCall = state === undefined;
  if ((action && action.namespace) !== namespace && !isInitializationCall)
    return state;
  return reducerFunction(state, action);
};

// a currying function that turns a given namespace into a namespaced action creator
const namespaceActionFactory = namespace => (actionCreator, ...actionArgs) => {
  const action = actionCreator(...actionArgs);
  return { ...action, namespace };
};

let nameSpaceAction = namespaceActionFactory();

const setActionCreatorNamespace = newNamespace => {
  nameSpaceAction = namespaceActionFactory(newNamespace);
};

// when we dispatch the action, we will do it in this way nameSpaceAction (actionCreator,...actionArgs)

export { nameSpaceAction, setActionCreatorNamespace, namespaceReducerFactory };
