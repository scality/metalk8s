//@flow
import ApiClient from '../ApiClient';

let alertmanagerApiClient: ?ApiClient = null;

export function initialize(apiUrl: string) {
  alertmanagerApiClient = new ApiClient({ apiUrl });
}

export type PrometheusAlert = {
  "annotations": {
    [key: string]: string,
  },
  "receivers": {
    "name": string
  }[],
  "fingerprint": string,
  "startsAt": string,
  "updatedAt": string,
  "endsAt": string,
  "status": {
    "state": "unprocessed" | "active" | "suppressed",
    "silencedBy": string[],
    "inhibitedBy": string[]
  },
  "labels": {
    [key: string]: string,
  },
  "generatorURL": string
}


export function getAlerts(): Promise<PrometheusAlert[]> {
  if (!alertmanagerApiClient) {
    throw new Error('alertmanagerApiClient should be defined');
  }
  return alertmanagerApiClient.get('/api/v2/alerts');
}
