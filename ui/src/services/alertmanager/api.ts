import ApiClient from '../ApiClient';
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
  // @ts-expect-error - FIXME when you are working on it
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
