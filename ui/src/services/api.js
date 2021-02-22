//@flow
import ApiClient from './ApiClient';

let apiClient: ApiClient = null;

export function initialize(apiUrl: string) {
  apiClient = new ApiClient({ apiUrl });
}

export type Brand = {
  alert: string,
  base: string,
  primary: string,
  primaryDark1: string,
  primaryDark2: string,
  secondary: string,
  secondaryDark1: string,
  secondaryDark2: string,
  success: string,
  healthy: string,
  healthyLight: string,
  warning: string,
  danger: string,
  critical: string,
  background: string,
  backgroundBluer: string,
  textPrimary: string,
  textSecondary: string,
  textTertiary: string,
  borderLight: string,
  border: string,
  info: string,
};

export type Theme = {
  brand: Brand,
  logo_path: string,
};

export type Themes = { [key: string]: Theme };

export type WrappedThemes = {
  theme: Themes,
  default: string,
};

export type Config = {
  url: string,
  url_salt: string,
  url_prometheus: string,
  url_grafana: string,
  url_oidc_provider: string,
  url_redirect: string,
  url_doc: string,
  url_alertmanager: string,
  flags?: [],
};

export function fetchTheme(): Promise<WrappedThemes> {
  return apiClient.get('/brand/theme.json');
}

export function fetchConfig(): Promise<Config> {
  return apiClient.get('/config.json');
}
