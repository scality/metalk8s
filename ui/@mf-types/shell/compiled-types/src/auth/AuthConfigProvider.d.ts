import React from 'react';
import type { OIDCConfig, OAuth2ProxyConfig } from '../initFederation/ConfigurationProviders';
export declare const useAuthConfig: () => {
    authConfig: OAuth2ProxyConfig | OIDCConfig | undefined;
    setAuthConfig: (authConfig: OAuth2ProxyConfig | OIDCConfig) => void;
};
export declare function AuthConfigProvider({ children, }: {
    children: React.ReactNode;
}): JSX.Element;
