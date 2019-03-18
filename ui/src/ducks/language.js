// Actions
const EDIT_LANG = 'EDIT_LANG';
const GET_LANG = 'GET_LANG';

// Reducer
const defaultState = {
  lang: 'en'
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case EDIT_LANG:
      return { ...state, lang: action.payload };
    case GET_LANG:
      return state.lang;
    default:
      return state;
  }
}

// Action Creators
export function getLang() {
  return { type: GET_LANG };
}

export function editLang(newLang) {
  return { type: EDIT_LANG, payload: newLang };
}

// Sagas
