import ApiClient from '../ApiClient';

let alertmanagerApiClient = null;

export function initialize(apiUrl) {
  alertmanagerApiClient = new ApiClient({ apiUrl });
}

export function getAlertsfromAlertManager() {
  return alertmanagerApiClient.get('/api/v2/alerts');
}
