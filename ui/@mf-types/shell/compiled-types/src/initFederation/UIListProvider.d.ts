import React from 'react';
import { z } from 'zod';
declare const UIDataSchema: z.ZodObject<{
    kind: z.ZodString;
    name: z.ZodString;
    version: z.ZodString;
    url: z.ZodString;
    appHistoryBasePath: z.ZodString;
}, z.core.$strip>;
type ValidatedUIData = z.infer<typeof UIDataSchema>;
export declare function useDeployedAppsRetriever(): {
    retrieveDeployedApps: (selectors?: {
        kind?: string;
        name?: string;
    }) => ValidatedUIData[];
};
export declare const useDeployedApps: (selectors?: {
    kind?: string;
    name?: string;
}) => ValidatedUIData[];
export declare const UIListProvider: ({ children, discoveryURL, }: {
    children: React.ReactNode;
    discoveryURL: string;
}) => import("react/jsx-runtime").JSX.Element;
export {};
