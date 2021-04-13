//@flow
import { useContext } from 'react';
import { Query } from 'react-query';
import { useAlerts } from '../AlertProvider';
import type { FilterLabels, Alert } from './alertUtils';
import { getHealthStatus } from './alertUtils';

export const getNodesAlertSelectors = (): FilterLabels => {
  return { alertname: ['NodeAtRisk', 'NodeDegraded'] };
};

export const getVolumesAlertName = (): FilterLabels => {
  return { alertname: ['VolumeAtRisk', 'VolumeDegraded'] };
};

export const getNetworksAlertName = (): FilterLabels => {
  return {
    alertname: ['ControlPlaneNetworkDegraded', 'WorkloadPlaneNetworkDegraded'],
  };
};

export const getServicesAlertName = (): FilterLabels => {
  return {
    alertname: ['PlatformServicesAtRisk', 'PlatformServicesDegraded'],
  };
};

/**
 *
 * @param {FilterLabels} filterss
 * @returns An array of alerts with the highest severity
 */
export const useHighestSeverityAlerts = (filters: FilterLabels): Alert[] => {
  const query = useAlerts(useContext)(filters);
  const filteredAlerts = query && query.alerts;

  const health = getHealthStatus(filteredAlerts);
  if (!filteredAlerts || !filteredAlerts.length) return [];
  return filteredAlerts.filter((alert) => alert.severity === health);
};
