import { removeWarningAlerts, formatActiveAlerts, sortAlerts } from './alertUtils';
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
  parents?: string[];
  // @ts-expect-error - FIXME when you are working on it
  selectors?: string[];
  [labelName: string]: string;
};
export function getAlerts(alertManagerUrl: string, token?: string) {
  return fetch(alertManagerUrl + '/api/v2/alerts', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((r) => {
      if (r.ok) {
        return r.json();
      }

      throw new Error(`Alert manager responded with ${r.status}`);
    })
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
