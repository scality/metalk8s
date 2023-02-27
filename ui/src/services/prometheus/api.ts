//@flow
import ApiClient from '../ApiClient';
export type RangeMatrixResult = {
  resultType: 'matrix';
  result: {
    metric: {
      [labelName: string]: string;
    };
    values: [number, string][];
  }[];
};

export type InstantVectorResult = {
  resultType: 'vector';
  result: {
    metric: {
      [labelName: string]: string;
    };
    value: [number, string];
  }[];
};

type ScalarResult = {
  resultType: 'scalar';
  result: [number, string];
};

type StringResult = {
  resultType: 'string';
  result: [number, string];
};

export type PrometheusQueryResult =
  | {
      status: 'error';
      errorType: string;
      error: string;
    }
  | {
      status: 'success';
      data:
        | RangeMatrixResult
        | InstantVectorResult
        | ScalarResult
        | StringResult;
      warnings?: string[];
    };

let prometheusApiClient = null;

export function initialize(apiUrl: string) {
  prometheusApiClient = new ApiClient({ apiUrl });
}

export function getAlerts() {
  if (prometheusApiClient) {
    return prometheusApiClient.get('/api/v1/alerts');
  }
}
// TODO Type
export function queryPrometheus(query: string, timestamp?: string): any {
  if (prometheusApiClient) {
    const timeQuery = timestamp ? `&time=${encodeURIComponent(timestamp)}` : '';
    return prometheusApiClient.get('/api/v1/query?query=' + query + timeQuery);
  }
}

export function queryPrometheusRange(
  start: string, // start (from when we want to fetch the metrics)
  end: string,
  step: number, // step (time in seconds between 2 metrics)
  query: string, // query (the actual PromQL expression)
): Promise<PrometheusQueryResult | undefined> {
  if (prometheusApiClient) {
    return prometheusApiClient.get(
      `/api/v1/query_range?start=${start}&end=${end}&step=${step}&query=` +
        query,
    );
  }
}
