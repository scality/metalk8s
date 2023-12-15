import { notFalsyTypeGuard } from '../typeGuard';
import ApiClient from './ApiClient';
let apiClient: ApiClient | null = null;
export function initialize(apiUrl: string) {
  apiClient = new ApiClient({
    apiUrl,
  });
}

export type Config = {
  url: string;
  url_salt: string;
  url_prometheus: string;
  url_grafana: string;
  url_doc: string;
  url_alertmanager: string;
  url_loki: string;
  flags?: string[];
  ui_base_path?: string;
  url_support?: string;
};

export function fetchConfig(): Promise<Config> {
  return notFalsyTypeGuard(apiClient, 'ApiClient is not defined').get(
    '/config.json',
  );
}
