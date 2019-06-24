import ApiClient from '../ApiClient';

let prometheusApiClient = null;

export function initialize(apiUrl) {
  prometheusApiClient = new ApiClient({ apiUrl });
}

export function getAlerts() {
  return prometheusApiClient.get('/api/v1/alerts');
}

export function getClusterStatus() {
  const query =
    'sum(up{job=~"apiserver|kube-scheduler|kube-controller-manager"} == 0)';
  return prometheusApiClient.get('/api/v1/query?query=' + query);
}
