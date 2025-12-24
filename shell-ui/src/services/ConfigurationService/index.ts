/**
 * ConfigurationService - Zustand-based configuration management for micro-frontends
 *
 * This module provides a centralized store for managing:
 * - Deployed UI applications (SolutionUI)
 * - WebFinger configurations (build-time and runtime)
 *
 * The store is designed to be shared across micro-frontends via Module Federation,
 * ensuring all apps have access to the same configuration state.
 *
 * @example
 * // In a micro-app (consuming via Module Federation)
 * import { useConfigurationStore, configurationStore } from 'shell/ConfigurationService';
 *
 * // React hook usage (subscribes to updates)
 * const deployedApps = useConfigurationStore((state) => state.deployedApps);
 *
 * // Vanilla usage (for non-React code)
 * const state = configurationStore.getState();
 * const apps = state.getDeployedApps({ kind: 'metalk8s-ui' });
 */

// Export the vanilla store for direct access
export { configurationStore } from './store';

// Export React hooks
export { useConfigurationStore, useConfigurationStoreState } from './store';

// Export types
export type {
  ConfigurationState,
  WebFingerResult,
  EnrichedBuildtimeWebFinger,
  RuntimeWebFinger,
  BuildtimeWebFinger,
  FederatedModuleInfo,
  View,
  OIDCConfig,
  OAuth2ProxyConfig,
} from './types';
