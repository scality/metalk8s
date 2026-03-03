const SET_HISTORY = 'SET_HISTORY';
const defaultState = {
  history: null,
};
export type HistoryState<T> = {
  history: T | null | undefined;
};
type SetHistoryAction<T> = {
  type: 'SET_HISTORY';
  history: T | null | undefined;
};
export const setHistory = <T>(history: T | null | undefined): SetHistoryAction<T> => {
  return {
    type: SET_HISTORY,
    history,
  };
};
type Actions<T> = SetHistoryAction<T>;
export function historyReducer<T>(state: HistoryState<T> = defaultState, action: Actions<T>) {
  switch (action.type) {
    case SET_HISTORY:
      return { ...state, history: action.history };

    default:
      return state;
  }
}
