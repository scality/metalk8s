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

/**
 * Minimal interface for UserManager to avoid type conflicts between
 * oidc-react's bundled oidc-client-ts and the direct import.
 */
export interface IUserManager {
  getUser: () => Promise<User | null>;
}

export interface AuthState {
  // State
  userData: UserData | null;
  status: AuthStatus;
  userManager: IUserManager | null;

  // Actions
  setUserData: (userData: UserData | null) => void;
  setStatus: (status: AuthStatus) => void;
  setAuth: (userData: UserData | null, status: AuthStatus) => void;
  setUserManager: (userManager: IUserManager) => void;
  clearAuth: () => void;

  // Selectors
  isAuthenticated: () => boolean;
  getToken: () => Promise<string | null>;
  getUsername: () => string | null;
  getGroups: () => string[];
}
