import React from 'react';
import type { FilterLabels, Alert } from '../services/alertUtils';
import { STATUS_HEALTH } from '../constants';
import { useConfig } from '../FederableApp';
import { QueryObserverResult } from 'react-query';
export type Status = 'healthy' | 'warning' | 'critical';

export const useAlerts = (
  filters: FilterLabels,
): Omit<QueryObserverResult<Alert[]>, 'data'> & { alerts?: Alert[] } => {
  return window.shellAlerts.hooks.useAlerts(filters);
};
export const useHighestSeverityAlerts = (filters: FilterLabels) => {
  return window.shellAlerts.hooks.useHighestSeverityAlerts(filters);
};
export const useAlertLibrary = () => {
  return window.shellAlerts.alertSelectors;
};

export const highestAlertToStatus = (alerts?: Alert[]): Status => {
  if (!alerts || !alerts[0]?.severity) {
    return STATUS_HEALTH;
  } else {
    if (
      alerts[0].severity !== 'warning' &&
      alerts[0].severity !== 'healthy' &&
      alerts[0].severity !== 'critical'
    ) {
      throw new Error('Unknow typeof severity');
    }
    return alerts[0]?.severity;
  }
};

const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const { url_alertmanager } = useConfig();
  return (
    <window.shellAlerts.AlertsProvider alertManagerUrl={url_alertmanager}>
      {children}
    </window.shellAlerts.AlertsProvider>
  );
};

export default AlertProvider;
