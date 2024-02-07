import React from 'react';
import { createContext, useContext } from 'react';
import { useQuery } from 'react-query';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import type { SolutionUI } from '@scality/module-federation';

if (!window.shellContexts) {
  // @ts-expect-error - FIXME when you are working on it
  window.shellContexts = {};
}
// @ts-expect-error - FIXME when you are working on it
if (!window.shellContexts.UIListContext) {
  // @ts-expect-error - FIXME when you are working on it
  window.shellContexts.UIListContext = createContext(null);
}

export function useDeployedAppsRetriever(): {
  retrieveDeployedApps: (selectors?: {
    kind?: string;
    name?: string;
  }) => SolutionUI[];
} {
  // @ts-expect-error - FIXME when you are working on it
  const uiListContext = useContext(window.shellContexts.UIListContext);

  if (!uiListContext) {
    throw new Error(
      "Can't use useDeployedAppsRetriever outside of UIListProvider",
    );
  }

  return {
    retrieveDeployedApps: (selectors) => {
      // @ts-expect-error - FIXME when you are working on it
      if (selectors && uiListContext.uis) {
        // @ts-expect-error - FIXME when you are working on it
        return uiListContext.uis.filter((ui) => {
          return (
            ((selectors.kind && selectors.kind === ui.kind) ||
              !selectors.kind) &&
            ((selectors.name && selectors.name === ui.name) || !selectors.name)
          );
        });
      }
      // @ts-expect-error - FIXME when you are working on it
      return uiListContext.uis || [];
    },
  };
}
export const useDeployedApps = (selectors?: {
  kind?: string;
  name?: string;
}): SolutionUI[] => {
  // @ts-expect-error - FIXME when you are working on it
  const uiListContext = useContext(window.shellContexts.UIListContext);

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
    () => {
      return fetch(discoveryURL, { cache: 'no-cache' }).then((r) => {
        if (r.ok) {
          return r.json();
        } else {
          return Promise.reject();
        }
      });
    },
    {
      refetchOnWindowFocus: false,
    },
  );
  return (
    // @ts-expect-error - FIXME when you are working on it
    <window.shellContexts.UIListContext.Provider
      value={{
        uis: data,
      }}
    >
      {(status === 'loading' || status === 'idle') && (
        <Loader size="massive" centered={true} aria-label="loading" />
      )}
      {status === 'error' && <ErrorPage500 data-cy="sc-error-page500" />}
      {status === 'success' && children}
      {/* @ts-expect-error - FIXME when you are working on it */}
    </window.shellContexts.UIListContext.Provider>
  );
};
