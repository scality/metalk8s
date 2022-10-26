import ApiClient from '../ApiClient';
import { STATUS_CRITICAL, STATUS_HEALTH } from '../../constants';
import {
  removeWarningAlerts,
  formatActiveAlerts,
  sortAlerts,
} from '../alertUtils';
let alertmanagerApiClient: ApiClient | null | undefined = null;
export function initialize(apiUrl: string) {
  alertmanagerApiClient = new ApiClient({
    apiUrl,
  });
}
export type PrometheusAlert = {
  annotations: Record<string, string>;
  receivers: {
    name: string;
  }[];
  fingerprint: string;
  startsAt: string;
  updatedAt: string;
  endsAt: string;
  status: {
    state: 'unprocessed' | 'active' | 'suppressed';
    silencedBy: string[];
    inhibitedBy: string[];
  };
  labels: Record<string, string>;
  generatorURL: string;
};
export type AlertLabels = {
  selectors?: string[];
  [labelName: string]: string;
};
export function getAlerts() {
  if (!alertmanagerApiClient) {
    throw new Error('alertmanagerApiClient should be defined');
  }

  return alertmanagerApiClient
    .get('/api/v2/alerts')
    .then((resolve) => {
      if (resolve.error) {
        throw resolve.error;
      }

      return resolve;
    })
    .then((result) => {
      // format the alerts then remove the warning and finally sort the alerts.
      return sortAlerts(removeWarningAlerts(formatActiveAlerts(result)));
    });
}
export const checkActiveAlertProvider = (): Promise<{
  status: 'healthy' | 'critical';
}> => {
  // depends on Watchdog to see the if Alertmanager is up
  return getAlerts().then((result) => {
    const watchdog = result.find(
      (alert) => alert.labels.alertname === 'Watchdog',
    );
    if (watchdog) return STATUS_HEALTH;
    else return STATUS_CRITICAL;
  });
};