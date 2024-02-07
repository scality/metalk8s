const SET_HISTORY = 'SET_HISTORY';
const defaultState = {
  history: null,
};
export type HistoryState = {
  history: History | null | undefined;
};
type SetHistoryAction = {
  type: 'SET_HISTORY';
  history: History | null | undefined;
};
export const setHistory = (
  history: History | null | undefined,
): SetHistoryAction => {
  return {
    type: SET_HISTORY,
    history,
  };
};
type Actions = SetHistoryAction;
export function historyReducer(
  state: HistoryState = defaultState,
  // @ts-expect-error - FIXME when you are working on it
  action: Actions = {},
) {
  switch (action.type) {
    case SET_HISTORY:
      return { ...state, history: action.history };

    default:
      return state;
  }
}
