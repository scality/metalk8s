//@flow
import { useContext } from 'react';
import { Query } from 'react-query';
import { useAlerts } from '../AlertProvider';
import type { FilterLabels, Alert } from './alertUtils';
import { getHealthStatus } from './alertUtils';

export const getPlatformAlertSelectors = (): FilterLabels => {
  return { alertname: ['PlatformAtRisk', 'PlatformDegraded'] };
};

export const getNodesAlertSelectors = (): FilterLabels => {
  return { alertname: ['NodeAtRisk', 'NodeDegraded'] };
};

export const getVolumesAlertSelectors = (): FilterLabels => {
  return { alertname: ['VolumeAtRisk', 'VolumeDegraded'] };
};

export const getNetworksAlertSelectors = (): FilterLabels => {
  return {
    alertname: ['ControlPlaneNetworkDegraded', 'WorkloadPlaneNetworkDegraded'],
  };
};

export const getServicesAlertSelectors = (): FilterLabels => {
  return {
    alertname: ['PlatformServicesAtRisk', 'PlatformServicesDegraded'],
  };
};

/**
 *
 * @param {useContext} useContext
 * @param {FilterLabels} filters
 * @returns An array of alerts with the highest severity
 */
export const useHighestSeverityAlerts = (
  useContext: typeof useContext,
  filters: FilterLabels,
): Alert[] => {
  const query = useAlerts(useContext)(filters);
  const filteredAlerts = query && query.alerts;

  const health = getHealthStatus(filteredAlerts);
  if (!filteredAlerts || !filteredAlerts.length) return [];
  return filteredAlerts.filter((alert) => alert.severity === health);
};
