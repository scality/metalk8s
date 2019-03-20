// Actions
const TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR';

// Reducer
const defaultState = {
  sidebar: {
    expanded: false
  }
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          expanded: !state.sidebar.expanded
        }
      };
    default:
      return state;
  }
}

// Action Creators
export const toggleSidebarAction = () => {
  return { type: TOGGLE_SIDEBAR };
};
