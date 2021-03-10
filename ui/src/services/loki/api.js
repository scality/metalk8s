//@flow
import ApiClient from '../ApiClient';
import { removeWarningAlerts, formatHistoryAlerts } from '../alertUtils';
import type { Alert } from '../alertUtils';

const METALK8S_HISTORY_ALERTS_QUERY = `{namespace="metalk8s-monitoring",container="alert-logger"}`;

let lokiApiClient: ?ApiClient = null;

export function initialize(apiUrl: string) {
  lokiApiClient = new ApiClient({ apiUrl });
}

export type StreamValue = {
  stream: {
    [labelName: string]: string,
  },
  values: [string, string][],
}[];
type LokiQueryResult = {
  status: 'success',
  data: {
    resultType: 'streams',
    result: StreamValue,
    // Those statistics allow users to understand the amount of data processed and at which speed.
    // https://grafana.com/docs/loki/latest/api/#Statistics
    stats: {},
  },
};

// by default to get the last 7day alerts from Loki
export function getLast7DaysAlerts(): Promise<Alert[]> {
  const start = new Date(
    new Date().getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const end = new Date().toISOString();

  return getAlertsLoki(start, end);
}

// customise the `start` and `end` time to retrieve the history alerts
export function getAlertsLoki(start: string, end: string): Promise<Alert[]> {
  if (!lokiApiClient) {
    throw new Error('lokiApiClient should be defined');
  }

  return lokiApiClient
    .get(
      `/loki/api/v1/query_range?start=${start}&end=${end}&query=${METALK8S_HISTORY_ALERTS_QUERY}`,
    )
    .then((resolve) => {
      if (resolve.error) {
        throw resolve.error;
      }
      return resolve;
    })
    .then((result: LokiQueryResult) => {
      return removeWarningAlerts(formatHistoryAlerts(result.data.result));
    });
}

// To be checked
export function isLokiReady(): Promise<boolean> {
  if (!lokiApiClient) {
    throw new Error('lokiApiClient should be defined');
  }

  return lokiApiClient.get('/ready').then((resolve) => {
    if (resolve.error) {
      throw resolve.error;
    }
    return resolve === 'ready';
  });
}
