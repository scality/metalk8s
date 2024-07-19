import React from 'react';
import type { SolutionUI } from '@scality/module-federation';
export declare function useDeployedAppsRetriever(): {
    retrieveDeployedApps: (selectors?: {
        kind?: string;
        name?: string;
    }) => SolutionUI[];
};
export declare const useDeployedApps: (selectors?: {
    kind?: string;
    name?: string;
}) => SolutionUI[];
export declare const UIListProvider: ({ children, discoveryURL, }: {
    children: React.ReactNode;
    discoveryURL: string;
}) => JSX.Element;
