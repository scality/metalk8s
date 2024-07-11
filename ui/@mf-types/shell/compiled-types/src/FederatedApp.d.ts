import React from 'react';
import { QueryClient } from 'react-query';
import { NotificationCenterContextType } from './NotificationCenterProvider';
import { useAuthConfig } from './auth/AuthConfigProvider';
import { useAuth } from './auth/AuthProvider';
import './index.css';
import { useConfigRetriever, useConfig, useDiscoveredViews, useLinkOpener, BuildtimeWebFinger, RuntimeWebFinger } from './initFederation/ConfigurationProviders';
import { useShellConfig } from './initFederation/ShellConfigProvider';
import { useShellThemeSelector } from './initFederation/ShellThemeSelectorProvider';
import { useDeployedApps } from './initFederation/UIListProvider';
import { useLanguage } from './navbar/lang';
import AlertProvider from './alerts/AlertProvider';
import { getAlertingAlertSelectors, getAuthenticationAlertSelectors, getBootstrapAlertSelectors, getDashboardingAlertSelectors, getIngressControllerAlertSelectors, getK8SMasterAlertSelectors, getLoggingAlertSelectors, getMonitoringAlertSelectors, getNetworksAlertSelectors, getNodesAlertSelectors, getPlatformAlertSelectors, getServicesAlertSelectors, getVolumesAlertSelectors, useAlerts, useHighestSeverityAlerts } from './alerts';
import { useHistory } from 'react-router';
import { UseQueryResult } from 'react-query';
export declare const queryClient: QueryClient;
export type ShellTypes = {
    shellHooks: {
        useAuthConfig: typeof useAuthConfig;
        useAuth: typeof useAuth;
        useConfigRetriever: typeof useConfigRetriever;
        useDiscoveredViews: typeof useDiscoveredViews;
        useShellConfig: typeof useShellConfig;
        useLanguage: typeof useLanguage;
        useConfig: typeof useConfig;
        useLinkOpener: typeof useLinkOpener;
        useDeployedApps: typeof useDeployedApps;
        useShellThemeSelector: typeof useShellThemeSelector;
    };
    shellAlerts: {
        AlertsProvider: typeof AlertProvider;
        hooks: {
            useAlerts: typeof useAlerts;
            useHighestSeverityAlerts: typeof useHighestSeverityAlerts;
        };
        alertSelectors: {
            getPlatformAlertSelectors: typeof getPlatformAlertSelectors;
            getNodesAlertSelectors: typeof getNodesAlertSelectors;
            getVolumesAlertSelectors: typeof getVolumesAlertSelectors;
            getNetworksAlertSelectors: typeof getNetworksAlertSelectors;
            getServicesAlertSelectors: typeof getServicesAlertSelectors;
            getK8SMasterAlertSelectors: typeof getK8SMasterAlertSelectors;
            getBootstrapAlertSelectors: typeof getBootstrapAlertSelectors;
            getMonitoringAlertSelectors: typeof getMonitoringAlertSelectors;
            getAlertingAlertSelectors: typeof getAlertingAlertSelectors;
            getLoggingAlertSelectors: typeof getLoggingAlertSelectors;
            getDashboardingAlertSelectors: typeof getDashboardingAlertSelectors;
            getIngressControllerAlertSelectors: typeof getIngressControllerAlertSelectors;
            getAuthenticationAlertSelectors: typeof getAuthenticationAlertSelectors;
        };
    };
};
declare global {
    interface Window {
        shellContexts: {
            ShellHistoryContext: React.Context<ReturnType<typeof useHistory> | null>;
            NotificationContext: React.Context<null | NotificationCenterContextType>;
            WebFingersContext: React.Context<null | UseQueryResult<BuildtimeWebFinger | RuntimeWebFinger<Record<string, unknown>>, unknown>[]>;
        };
        shellHooks: ShellTypes['shellHooks'];
        shellAlerts: ShellTypes['shellAlerts'];
    }
}
export declare function WithInitFederationProviders({ children, }: {
    children: React.ReactNode;
}): JSX.Element;
export default function App(): JSX.Element;
