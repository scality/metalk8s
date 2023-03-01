export type AuthErrorState = {
  isAuthError: boolean;
};
type AuthErrorAction = {
  type: 'AUTH_ERROR';
};
const defaultState: AuthErrorState = {
  isAuthError: false,
};
export default function reducer(
  state: AuthErrorState = defaultState,
  action: AuthErrorAction,
) {
  switch (action.type) {
    case 'AUTH_ERROR': {
      return { ...state, isAuthError: true };
    }

    default:
      return { ...state };
  }
}
export function authErrorAction() {
  return {
    type: 'AUTH_ERROR',
  };
}