import type { FilterLabels, Alert } from './services/alertUtils';
export declare const getPlatformAlertSelectors: () => FilterLabels;
export declare const getNodesAlertSelectors: () => FilterLabels;
export declare const getVolumesAlertSelectors: () => FilterLabels;
export declare const getNetworksAlertSelectors: () => FilterLabels;
export declare const getServicesAlertSelectors: () => FilterLabels;
export declare const getK8SMasterAlertSelectors: () => FilterLabels;
export declare const getBootstrapAlertSelectors: () => FilterLabels;
export declare const getMonitoringAlertSelectors: () => FilterLabels;
export declare const getAlertingAlertSelectors: () => FilterLabels;
export declare const getLoggingAlertSelectors: () => FilterLabels;
export declare const getDashboardingAlertSelectors: () => FilterLabels;
export declare const getIngressControllerAlertSelectors: () => FilterLabels;
export declare const getAuthenticationAlertSelectors: () => FilterLabels;
/**
 *
 * @param {FilterLabels} filters
 * @returns An array of alerts with the highest severity
 */
export declare const useHighestSeverityAlerts: (filters: FilterLabels) => Alert[];
/**
 * Hook that enables retrieval of alerts fetched by <AlertProvider />
 *
 * @returns react query result
 */
export declare function useAlerts(filters: FilterLabels): any;
