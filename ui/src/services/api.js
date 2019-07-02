import ApiClient from './ApiClient';

let apiClient = null;

export function initialize(apiUrl) {
  apiClient = new ApiClient({ apiUrl });
}

export function fetchTheme() {
  return apiClient.get('/brand/theme.json');
}

export function fetchConfig() {
  return apiClient.get('/config.json');
}
