import ApiClient from './ApiClient';

let apiClient = null;

export function initialize(apiUrl) {
  apiClient = new ApiClient({ apiUrl });
}

export function fetchTheme() {
  return apiClient.get('/brand/theme.json');
}

export function fetchConfig() {
  console.warn('Dont forget to change back');
  return apiClient.get('/external-component/metalk8s/config.json');
  // return apiClient.get('/config.json');
}
