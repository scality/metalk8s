import ApiClient from './ApiClient';
let apiClient: ApiClient = null;
export function initialize(apiUrl: string) {
  apiClient = new ApiClient({
    apiUrl,
  });
}
export type Brand = {
  statusHealthy: string;
  statusWarning: string;
  statusCritical: string;
  selectedActive: string;
  highlight: string;
  border: string;
  buttonPrimary: string;
  buttonSecondary: string;
  buttonDelete: string;
  infoPrimary: string;
  infoSecondary: string;
  backgroundLevel1: string;
  backgroundLevel2: string;
  backgroundLevel3: string;
  backgroundLevel4: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textReverse: string;
  textLink: string;
};
export type Theme = {
  brand: Brand;
};
export type Config = {
  url: string;
  url_salt: string;
  url_prometheus: string;
  url_grafana: string;
  url_doc: string;
  url_alertmanager: string;
  url_loki: string;
  flags?: [];
  url_navbar: string;
  url_navbar_config: string;
  ui_base_path?: string;
  url_alerts: string;
  alerts_lib_version: string;
  url_support?: string;
};
export function fetchConfig(): Promise<Config> {
  return apiClient.get('/config.json');
}