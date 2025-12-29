import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { AuthState, UserData, AuthStatus } from './types';

/**
 * Vanilla Zustand store for authentication state management.
 * This store can be used both inside and outside React components.
 * It's designed to be shared across micro-frontends via Module Federation.
 */
export const authStore = createStore<AuthState>((set, get) => ({
  // Initial state
  userData: null,
  status: 'idle',

  // Actions
  setUserData: (userData: UserData | null) => {
    set({ userData });
  },

  setStatus: (status: AuthStatus) => {
    set({ status });
  },

  setAuth: (userData: UserData | null, status: AuthStatus) => {
    set({ userData, status });
  },

  clearAuth: () => {
    set({ userData: null, status: 'unauthenticated' });
  },

  // Selectors
  isAuthenticated: () => {
    const { userData, status } = get();
    return status === 'authenticated' && userData !== null;
  },

  getToken: () => {
    const { userData } = get();
    return userData?.token ?? null;
  },

  getUsername: () => {
    const { userData } = get();
    return userData?.username ?? null;
  },

  getGroups: () => {
    const { userData } = get();
    return userData?.groups ?? [];
  },
}));

/**
 * React hook to access the auth store with a selector.
 * Use this in React components to subscribe to store updates.
 */
export const useAuthStore = <T>(selector: (state: AuthState) => T): T => {
  return useStore(authStore, selector);
};

/**
 * React hook to get the full auth store state.
 * Prefer using selectors with useAuthStore for better performance.
 */
export const useAuthStoreState = (): AuthState => {
  return useStore(authStore);
};
