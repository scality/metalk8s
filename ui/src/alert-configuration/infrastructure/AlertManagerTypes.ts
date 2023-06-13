export type AlertManagerConfig = {
  global?: GlobalConfig | null;
  route?: Route | null;
  inhibit_rules?: InhibitRule[] | null;
  receivers?: Receiver[] | null;
  templates?: string[];
  original?: string;
};

type GlobalConfig = {
  http_config?: HTTPClientConfig | null;
  smtp_from?: string | null;
  smtp_hello?: string | null;
  smtp_smarthost?: string | null;
  smtp_auth_username?: string | null;
  smtp_auth_password?: Secret | null;
  smtp_auth_password_file?: string | null;
  smtp_auth_secret?: Secret | null;
  smtp_auth_identity?: string | null;
  smtp_require_tls?: boolean | null;
  slack_api_url?: SecretURL | null;
  slack_api_url_file?: string | null;
};

type SecretURL = URL;

type Secret = string;

export type Route = {
  receiver?: string | null;
  group_by?: string[] | null;
  group_by_all?: boolean | null;
  match?: { [key: string]: string } | null;
  match_re?: MatchRegexps | null;
  matchers?: Matchers | null;
  mute_time_intervals?: string[] | null;
  active_time_intervals?: string[] | null;
  continue?: boolean;
  routes?: Route[] | null;
  group_wait?: string | null;
  group_interval?: string | null;
  repeat_interval?: string | null;
};

type Matchers = string[];

type MatchRegexps = {
  [key: string]: RegExp;
};

type InhibitRule = {
  source_match?: { [key: string]: string } | null;
  source_match_re?: MatchRegexps | null;
  source_matchers?: Matchers | null;
  target_match?: { [key: string]: string } | null;
  target_match_re?: MatchRegexps | null;
  target_matchers?: Matchers | null;
  equal?: string[] | null;
};

export type Receiver = {
  name: string;
  email_configs?: EmailConfig[] | null;
  slack_configs?: SlackConfig[] | null;
};

type SlackConfig = {
  send_resolved?: boolean | null;
  name: string;
  http_config?: HTTPClientConfig | null;
  api_url?: SecretURL | null;
  api_url_file?: string | null;
  channel?: string | null;
  username?: string | null;
  color?: string | null;
  title?: string | null;
  title_link?: string | null;
  pretext?: string | null;
  text?: string | null;
  fields?: SlackField[] | null;
  short_fields?: boolean | null;
  footer?: string | null;
  fallback?: string | null;
  callback_id?: string | null;
  icon_emoji?: string | null;
  icon_url?: string | null;
  image_url?: string | null;
  thumb_url?: string | null;
  link_names?: boolean | null;
  mrkdwn_in?: string[] | null;
  actions?: SlackAction[] | null;
};

type SlackField = {
  title?: string | null;
  value?: string | null;
  short?: boolean | null;
};

type SlackAction = {
  type?: string | null;
  text?: string | null;
  url?: string | null;
  style?: string | null;
  name?: string | null;
  value?: string | null;
  confirm?: SlackConfirmationField | null;
};

type SlackConfirmationField = {
  text?: string | null;
  title?: string | null;
  ok_text?: string | null;
  dismiss_text?: string | null;
};

type EmailConfig = {
  send_resolved?: boolean | null;
  to?: string | null;
  from?: string | null;
  hello?: string | null;
  smarthost?: string | null;
  auth_username?: string | null;
  auth_password?: Secret | null;
  auth_password_file?: string | null;
  auth_secret?: Secret | null;
  auth_identity?: string | null;
  headers?: { [key: string]: string } | null;
  html?: string | null;
  text?: string | null;
  require_tls?: boolean | null;
  tls_config?: TLSConfig | null;
};

type HTTPClientConfig = {
  basic_auth?: BasicAuth | null;
  authorization?: Authorization | null;
  oauth2?: OAuth2 | null;
  bearer_token?: Secret | null;
  bearer_token_file?: string | null;
  tls_config?: TLSConfig | null;
  follow_redirects: boolean;
  enable_http2: boolean;
  proxy_config: ProxyConfig;
};

type TLSConfig = {
  ca?: string | null;
  cert?: string | null;
  key?: Secret | null;
  ca_file?: string | null;
  cert_file?: string | null;
  key_file?: string | null;
  server_name?: string | null;
  insecure_skip_verify: boolean;
  min_version?: TLSVersion | null;
  max_version?: TLSVersion | null;
};

type BasicAuth = {
  username: string;
  password?: Secret | null;
  password_file?: string | null;
};

type Authorization = {
  type?: string | null;
  credentials?: Secret | null;
  credentials_file?: string | null;
};

type OAuth2 = {
  client_id: string;
  client_secret: Secret;
  client_secret_file: string;
  scopes?: string[] | null;
  token_url: string;
  endpoint_params?: { [key: string]: string } | null;
  tls_config?: TLSConfig | null;
  proxy_config: ProxyConfig;
};

type TLSVersion = number;

type ProxyConfig = {
  proxy_url?: URL | null;
  no_proxy?: string | null;
  proxy_from_environment?: boolean | null;
  proxy_connect_header?: Header | null;
};

type Header = {
  [key: string]: Secret[];
};
