import { IconName } from '@scality/core-ui/dist/components/icon/Icon.component';
import { SolutionUI } from '@scality/module-federation';
import React from 'react';
export type OAuth2ProxyConfig = {
    kind: 'OAuth2Proxy';
};
export type OIDCConfig = {
    kind: 'OIDC';
    providerUrl: string;
    redirectUrl: string;
    clientId: string;
    responseType: string;
    scopes: string;
    providerLogout?: boolean;
    defaultDexConnector?: string;
};
export type RuntimeWebFinger<C> = {
    kind: 'MicroAppRuntimeConfiguration';
    apiVersion: 'ui.scality.com/v1alpha1';
    metadata: {
        kind: string;
        name: string;
    };
    spec: {
        title: string;
        selfConfiguration: C;
        auth: OIDCConfig | OAuth2ProxyConfig;
    };
};
export type FederatedModuleInfo = {
    module: string;
    scope: string;
};
export type View = {
    path: string;
    activeIfMatches?: string;
    exact?: boolean;
    strict?: boolean;
    sensitive?: boolean;
    label: {
        en: string;
        fr: string;
    };
} & FederatedModuleInfo;
export type BuildtimeWebFinger = {
    kind: 'MicroAppConfiguration';
    apiVersion: 'ui.scality.com/v1alpha1';
    metadata: {
        kind: string;
    };
    spec: {
        remoteEntryPath: string;
        views: Record<string, View>;
        hooks: Record<string, FederatedModuleInfo>;
        components: Record<string, FederatedModuleInfo>;
        navbarUpdaterComponents?: FederatedModuleInfo[];
        instanceNameAdapter?: FederatedModuleInfo;
    };
};
export declare function useConfigRetriever(): {
    retrieveConfiguration: <T extends 'build' | Record<string, unknown>>(arg0: {
        configType: T extends 'build' ? 'build' : 'run';
        name: string;
    }) => (T extends 'build' ? BuildtimeWebFinger : RuntimeWebFinger<T>) | null;
};
export declare function useConfig<T extends 'build' | Record<string, unknown>>({ configType, name, }: {
    configType: T extends 'build' ? 'build' : 'run';
    name: string;
}): null | T extends 'build' ? BuildtimeWebFinger : RuntimeWebFinger<T>;
export type FederatedView = {
    isFederated: true;
    app: SolutionUI;
    view: View;
    groups?: string[];
    icon?: IconName;
    navbarGroup: 'main' | 'subLogin';
};
export type NonFederatedView = {
    isFederated: false;
    url: string;
    view: {
        label: {
            en: string;
            fr: string;
        };
    };
    isExternal: boolean;
    groups?: string[];
    navbarGroup: 'main' | 'subLogin';
    icon?: IconName;
};
export type ViewDefinition = FederatedView | NonFederatedView;
export declare function useDiscoveredViews(): ViewDefinition[];
export declare const useLinkOpener: () => {
    openLink: (to: {
        isExternal?: boolean;
        app: SolutionUI;
        view: View;
        isFederated: true;
    } | {
        isFederated: false;
        isExternal?: boolean;
        url: string;
    }) => void;
};
export declare const ConfigurationProvider: ({ children, }: {
    children: React.ReactNode;
}) => JSX.Element;
