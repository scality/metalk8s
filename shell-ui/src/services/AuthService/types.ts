import type { User } from 'oidc-client-ts';

export type UserData = {
  token: string;
  username: string;
  groups: string[];
  email: string;
  id: string;
  original: User;
};

export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

export interface AuthState {
  // State
  userData: UserData | null;
  status: AuthStatus;

  // Actions
  setUserData: (userData: UserData | null) => void;
  setStatus: (status: AuthStatus) => void;
  setAuth: (userData: UserData | null, status: AuthStatus) => void;
  clearAuth: () => void;

  // Selectors
  isAuthenticated: () => boolean;
  getToken: () => string | null;
  getUsername: () => string | null;
  getGroups: () => string[];
}
