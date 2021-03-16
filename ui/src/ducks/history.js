//@flow
const SET_HISTORY = "SET_HISTORY";

const defaultState = {
    history: null,
  };

export type HistoryState = {
    history: ?History;
}

type SetHistoryAction = {type: "SET_HISTORY", history: ?History};

export const setHistory = (history: ?History): SetHistoryAction => {
    return {type: SET_HISTORY, history}
}

type Actions = SetHistoryAction;

export function historyReducer(state: HistoryState = defaultState, action: Actions = {}) {
    switch (action.type) {
        case SET_HISTORY: 
           return {
            ...state,
            history: action.history,
          };
    
        default:
          return state;
    }
}
