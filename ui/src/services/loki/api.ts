import ApiClient from '../ApiClient';
import { formatHistoryAlerts } from '../alertUtils';
import type { Alert } from '../alertUtils';
const METALK8S_HISTORY_ALERTS_QUERY = `{namespace="metalk8s-monitoring",container="metalk8s-alert-logger"}`;
export const LOKI_RE_NOTIFICATION_INTERVAL = 12 * 60 * 60 * 1000;
const MAX_ENTRIES_LIMIT = 4999;
let lokiApiClient: ApiClient | null | undefined = null;
export function initialize(apiUrl: string) {
  lokiApiClient = new ApiClient({
    apiUrl,
  });
}
export type StreamValue = {
  stream: Record<string, string>;
  values: [string, string][];
}[];
type LokiQueryResult = {
  status: 'success';
  data: {
    resultType: 'streams';
    result: StreamValue;
    // Those statistics allow users to understand the amount of data processed and at which speed.
    // https://grafana.com/docs/loki/latest/api/#Statistics
    stats: {};
  };
};
// by default to get the last 7day alerts from Loki
export function getLast7DaysAlerts(): Promise<Alert[]> {
  const start = new Date(
    new Date().getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const end = new Date().toISOString();
  return getAlertsLoki(start, end);
}
// WARNING:
// By using this function may cause performance issue
// We may need to perform the query many times, in order to retrieve all the metrics for the expected time period.
export function getAlertsLoki(
  start: string,
  end: string,
): Promise<LokiQueryResult> {
  if (!lokiApiClient) {
    throw new Error('lokiApiClient should be defined');
  }

  if (
    new Date(end).getTime() - new Date(start).getTime() <
    LOKI_RE_NOTIFICATION_INTERVAL
  ) {
    start = new Date(
      new Date(end).getTime() - LOKI_RE_NOTIFICATION_INTERVAL,
    ).toISOString();
  }

  return lokiApiClient
    .get(
      //We set limit to 4999 because the default number of lines retrievable is 100 which is
      //not enough to fill the global health component with 7 days of data
      `/loki/api/v1/query_range?start=${start}&end=${end}&limit=${MAX_ENTRIES_LIMIT}&query=${METALK8S_HISTORY_ALERTS_QUERY}`,
    )
    .then((resolve) => {
      if (resolve.error) {
        throw resolve.error;
      }

      return resolve;
    })
    .then(async (result: LokiQueryResult) => {
      let resultCount = result.data.result
        .map((stream) => stream.values.length)
        .reduce((sum, count) => sum + count, 0);
      const aggregatedResult = [result];

      if (resultCount < MAX_ENTRIES_LIMIT) {
        return result;
      } else {
        while (resultCount === MAX_ENTRIES_LIMIT) {
          // find the smallest timestamp in all the stream entries
          const lastestTimestamp = result.data.result.map((stream) =>
            parseInt(stream.values[stream.values.length - 1][0], 10),
          );
          const oldestTimestamp = Math.min(...lastestTimestamp);
          const nextResult = await getAlertsLoki(
            new Date(oldestTimestamp / 1000000).toISOString(),
            end,
          );
          resultCount = nextResult.data.result
            .map((stream) => stream.values.length)
            .reduce((sum, count) => sum + count, 0);
          aggregatedResult.push(nextResult);
        }

        // build a fake loki result for aggregatedResult
        return {
          status: 'success',
          data: {
            resultType: 'streams',
            result: aggregatedResult.flatMap((result) => result.data.result),
          },
        };
      }
    });
}
export async function getFormattedLokiAlert(
  start: string,
  end: string,
): Promise<Alert[]> {
  const lokiQueryResult = await getAlertsLoki(start, end);
  return formatHistoryAlerts(lokiQueryResult.data.result).filter((alert) =>
    ['critical', 'warning', 'unavailable'].includes(alert.severity),
  );
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
