import React from 'react';
import { createContext, useContext } from 'react';
import { useQuery } from 'react-query';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { z } from 'zod';

/**
 * Removes trailing slash from a URL to prevent double slashes when concatenating paths
 * @param url - The URL to clean
 * @returns The URL without trailing slash
 */
const removeTrailingSlash = (url: string): string => url.replace(/\/$/, '');

// Zod schema for validating the UI data structure
const UIDataSchema = z.object({
  kind: z.string(),
  name: z.string(),
  version: z.string(),
  url: z.string(),
  appHistoryBasePath: z.string(),
});

// Schema for the array of UI data
const UIListSchema = z.array(UIDataSchema);

// Type for the validated UI data
type ValidatedUIData = z.infer<typeof UIDataSchema>;
type ValidatedUIList = z.infer<typeof UIListSchema>;

const UIListContext = createContext<{ uis: ValidatedUIList | undefined } | null>(null);

export function useDeployedAppsRetriever(): {
  retrieveDeployedApps: (selectors?: {
    kind?: string;
    name?: string;
  }) => ValidatedUIData[];
} {
  const uiListContext = useContext(UIListContext);

  if (!uiListContext) {
    throw new Error(
      "Can't use useDeployedAppsRetriever outside of UIListProvider",
    );
  }

  return {
    retrieveDeployedApps: (selectors) => {
      if (selectors && uiListContext.uis) {
        return uiListContext.uis.filter((ui) => {
          return (
            ((selectors.kind && selectors.kind === ui.kind) ||
              !selectors.kind) &&
            ((selectors.name && selectors.name === ui.name) || !selectors.name)
          );
        });
      }
      return uiListContext.uis || [];
    },
  };
}
export const useDeployedApps = (selectors?: {
  kind?: string;
  name?: string;
}): ValidatedUIData[] => {
  const uiListContext = useContext(UIListContext);

  if (!uiListContext) {
    throw new Error("Can't use useDeployedApps outside of UIListProvider");
  }

  const { retrieveDeployedApps } = useDeployedAppsRetriever();
  return retrieveDeployedApps(selectors);
};
export const UIListProvider = ({
  children,
  discoveryURL,
}: {
  children: React.ReactNode;
  discoveryURL: string;
}) => {
  const { status, data } = useQuery(
    'discoveredUIs',
    async () => {
      const r = await fetch(discoveryURL, { cache: 'no-cache' });
      if (r.ok) {
        const rawData = await r.json();
        try {
          // Validate the response data with Zod
          const validatedData = UIListSchema.parse(rawData);
          // Apply transformations after validation to ensure type safety
          const transformedData = validatedData.map(ui => ({
            ...ui,
            url: removeTrailingSlash(ui.url),
            appHistoryBasePath: removeTrailingSlash(ui.appHistoryBasePath),
          }));
          return transformedData;
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.error('Invalid UI data structure:', error.issues);
            console.error('Raw data received:', rawData);
          }
          // For now, return the raw data if validation fails to avoid breaking the app
          console.warn('Falling back to raw data due to validation failure');
          return rawData;
        }
      } else {
        return Promise.reject();
      }
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  return (
    <UIListContext.Provider
      value={{
        uis: data,
      }}
    >
      {(status === 'loading' || status === 'idle') && (
        <Loader size="massive" centered={true} aria-label="loading" />
      )}
      {status === 'error' && <ErrorPage500 data-cy="sc-error-page500" />}
      {status === 'success' && children}
    </UIListContext.Provider>
  );
};
