import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type {
  ConfigurationState,
  WebFingerResult,
  EnrichedBuildtimeWebFinger,
  RuntimeWebFinger,
} from './types';
import type { SolutionUI } from '@scality/module-federation';

/**
 * Vanilla Zustand store for configuration management.
 * This store can be used both inside and outside React components.
 * It's designed to be shared across micro-frontends via Module Federation.
 */
export const configurationStore = createStore<ConfigurationState>(
  (set, get) => ({
    // Initial state
    webFingers: [],
    deployedApps: [],

    // Actions
    setWebFingers: (webFingers: WebFingerResult[]) => {
      const currentWebFingers = get().webFingers;
      // Only update if the state has actually changed (shallow comparison of status and data)
      const hasChanged =
        currentWebFingers.length !== webFingers.length ||
        currentWebFingers.some(
          (item, index) =>
            item.status !== webFingers[index]?.status ||
            JSON.stringify(item.data) !==
              JSON.stringify(webFingers[index]?.data),
        );

      if (hasChanged) {
        set({ webFingers });
      }
    },

    setDeployedApps: (deployedApps: SolutionUI[]) => {
      set({ deployedApps });
    },

    // Selectors
    getDeployedApps: (filter?: { name?: string; kind?: string }) => {
      const { deployedApps } = get();

      if (!filter) {
        return deployedApps;
      }

      return deployedApps.filter((app) => {
        if (filter.name && app.name !== filter.name) {
          return false;
        }
        if (filter.kind && app.kind !== filter.kind) {
          return false;
        }
        return true;
      });
    },

    getConfiguration: <T extends 'build' | Record<string, unknown>>({
      configType,
      name,
      url,
    }: {
      configType: T extends 'build' ? 'build' : 'run';
      name: string;
      url?: string;
    }) => {
      const { webFingers, deployedApps } = get();

      if (configType !== 'build' && configType !== 'run') {
        throw new Error(
          `Invalid configType: it should be 'build' or 'run' but received '${configType}'`,
        );
      }

      // Find matching apps
      const apps = deployedApps.filter((app) => app.name === name);

      if (!apps || apps.length === 0) {
        return null;
      }

      // Filter webFingers by status and config type
      const configs = webFingers
        .filter((webFinger) => {
          return (
            webFinger.status === 'success' &&
            ((configType === 'build' &&
              webFinger.data?.kind === 'MicroAppConfiguration') ||
              (configType === 'run' &&
                webFinger.data?.kind === 'MicroAppRuntimeConfiguration'))
          );
        })
        .map((webFinger) => webFinger.data) as (
        | EnrichedBuildtimeWebFinger
        | RuntimeWebFinger<Record<string, unknown>>
      )[];

      // Find matching configuration
      const config = configs.find((webFinger) => {
        if (
          webFinger.kind === 'MicroAppRuntimeConfiguration' &&
          webFinger.metadata.name === name
        ) {
          return true;
        }
        if (
          webFinger.kind === 'MicroAppConfiguration' &&
          webFinger.metadata.kind === apps[0].kind
        ) {
          if (url) {
            return (
              (webFinger as EnrichedBuildtimeWebFinger).metadata.url === url
            );
          }
          return true;
        }
        return false;
      });

      if (!config) {
        const listOfKnownConfigurations = JSON.stringify(configs, null, 2);
        if (configType === 'build') {
          console.warn(
            `MicroApp's MicroAppConfiguration not found for app with kind ${apps[0].kind}.
          This warning usually happens when your app's "kind" in deployed-ui-apps does not match the MicroAppConfiguration.
          Please check your MicroAppConfiguration. Here is a list of known configurations:
          ${listOfKnownConfigurations}`,
          );
          return null;
        }
        if (configType === 'run') {
          console.warn(
            `MicroApp's RuntimeAppConfiguration not found for app with name ${name} and kind ${apps[0].kind}.
          This warning usually happens when your app's "name" and "kind" in deployed-ui-apps does not match the RuntimeAppConfiguration.
          Please check your RuntimeAppConfiguration. Here is a list of known configurations:
          ${listOfKnownConfigurations}`,
          );
          return null;
        }
      }

      return config as
        | (T extends 'build' ? EnrichedBuildtimeWebFinger : RuntimeWebFinger<T>)
        | null;
    },
  }),
);

/**
 * React hook to access the configuration store.
 * Use this in React components to subscribe to store updates.
 */
export const useConfigurationStore = <T>(
  selector: (state: ConfigurationState) => T,
): T => {
  return useStore(configurationStore, selector);
};

/**
 * React hook to get the full configuration store state.
 * Prefer using selectors with useConfigurationStore for better performance.
 */
export const useConfigurationStoreState = (): ConfigurationState => {
  return useStore(configurationStore);
};
