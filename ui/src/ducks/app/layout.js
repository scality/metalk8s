// Actions
const TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR';
const LAYOUT_LOADING = 'LAYOUT_LOADING';

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
    case LAYOUT_LOADING:
      return {
        ...state,
        loading: action.loading
      };
    default:
      return state;
  }
}

// Action Creators
export const toggleSidebarAction = () => {
  return { type: TOGGLE_SIDEBAR };
};

export const layoutLoadingAction = loading => {
  return { type: LAYOUT_LOADING, loading };
};
