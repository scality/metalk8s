import React from 'react';
import { QueryObserverResult } from 'react-query';
import { STATUS_HEALTH } from '../constants';
import { useConfig } from '../FederableApp';
import type { Alert, FilterLabels } from '../services/alertUtils';
import { useShellAlerts } from '@scality/module-federation';
export type Status = 'healthy' | 'warning' | 'critical';

export const useAlerts = (
  filters?: FilterLabels,
): Omit<QueryObserverResult<Alert[]>, 'data'> & { alerts?: Alert[] } => {
  const { alertHooks } = useShellAlerts();
  return alertHooks.useAlerts(filters);
};
export const useHighestSeverityAlerts = (filters: FilterLabels) => {
  const { alertHooks } = useShellAlerts();
  return alertHooks.useHighestSeverityAlerts(filters);
};
export const useAlertLibrary = () => {
  const { alertSelectors } = useShellAlerts();
  return alertSelectors;
};

export const highestAlertToStatus = (alerts?: Alert[]): Status => {
  if (!alerts || !alerts[0]?.severity) {
    return STATUS_HEALTH;
  } else {
    if (alerts[0].severity !== 'warning' && alerts[0].severity !== 'healthy' && alerts[0].severity !== 'critical') {
      throw new Error('Unknow typeof severity');
    }
    return alerts[0]?.severity;
  }
};

const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const { url_alertmanager } = useConfig();
  const alerts = useShellAlerts();
  return <alerts.AlertsProvider alertManagerUrl={url_alertmanager}>{children}</alerts.AlertsProvider>;
};

export default AlertProvider;
