import ApiClient from '../ApiClient';

let prometheusApiClient = null;

export function initialize(apiUrl) {
  prometheusApiClient = new ApiClient({ apiUrl });
}

export function getAlerts() {
  return prometheusApiClient.get('/api/v1/alerts');
}

export function queryPrometheus(query) {
  return prometheusApiClient.get('/api/v1/query?query=' + query);
}

// start (from when we want to fetch the metrics)
// end
// step (time in seconds between 2 metrics)
// query (the actual PromQL expression)
export function queryPrometheusRange(start, end, step, query) {
  return prometheusApiClient.get(
    `/api/v1/query_range?start=${start}&end=${end}&step=${step}&query=` + query,
  );
}
