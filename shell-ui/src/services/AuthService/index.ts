/**
 * AuthService - Zustand-based authentication state management for micro-frontends
 *
 * This module provides a centralized store for managing:
 * - User authentication state (userData, status)
 * - Token access
 * - User groups and permissions
 *
 * The store is designed to be shared across micro-frontends via Module Federation,
 * ensuring all apps have access to the same authentication state.
 *
 * @example
 * // In a micro-app (consuming via Module Federation)
 * import { useAuthStore, authStore } from 'shell/AuthService';
 *
 * // React hook usage (subscribes to updates)
 * const userData = useAuthStore((state) => state.userData);
 * const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
 *
 * // Vanilla usage (for non-React code)
 * const state = authStore.getState();
 * const token = state.getToken();
 * const groups = state.getGroups();
 */

// Export the vanilla store for direct access
export { authStore } from './store';

// Export React hooks
export { useAuthStore, useAuthStoreState } from './store';

// Export types
export type { AuthState, UserData, AuthStatus } from './types';
