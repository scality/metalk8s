/**
 * generateRuntimeConfiguration.ts
 *
 * This script generates the runtime configuration file for the MetalK8s UI.
 * The configuration is used by the micro-frontend architecture to configure
 * authentication, API endpoints, and UI-specific settings.
 *
 * Output: public/.well-known/runtime-app-configuration
 *
 * Environment Variables (all optional):
 * -------------------------------------
 *   - OIDC_PROVIDER_URL  : URL of the OIDC provider (default: '/oidc')
 *   - AUTH_REDIRECT_URL  : URL to redirect after authentication (default: 'http://localhost:8084/')
 *   - AUTH_CLIENT_ID     : OIDC client ID for the UI application (default: 'metalk8s-ui')
 *   - AUTH_SCOPES        : OIDC scopes to request (default: 'openid profile email groups offline_access audience:server:client_id:oidc-auth-client')
 *   - UI_BASE_PATH       : Base path for the UI (default: '/')
 *   - FLAGS              : Comma-separated feature flags (default: 'dashboard')
 *
 * Usage:
 *   npx ts-node generateRuntimeConfiguration.ts
 *   # or with custom values:
 *   OIDC_PROVIDER_URL=https://... AUTH_CLIENT_ID=my-client npx ts-node generateRuntimeConfiguration.ts
 */

import path from 'path';
import fs from 'fs';

// -----------------------------------------------------------------------------
// Default Values
// -----------------------------------------------------------------------------

const DEFAULTS = {
  OIDC_PROVIDER_URL: '/oidc',
  AUTH_REDIRECT_URL: 'http://localhost:8084/',
  AUTH_CLIENT_ID: 'metalk8s-ui',
  AUTH_SCOPES:
    'openid profile email groups offline_access audience:server:client_id:oidc-auth-client',
  UI_BASE_PATH: '/',
  FLAGS: 'dashboard',
} as const;

// -----------------------------------------------------------------------------
// Environment Variable Parsing
// -----------------------------------------------------------------------------

/**
 * Gets an environment variable value or returns the default.
 */
function getEnv(name: keyof typeof DEFAULTS): string {
  return process.env[name] ?? DEFAULTS[name];
}

/**
 * Parses the FLAGS environment variable into an array.
 * Supports comma-separated values (e.g., "dashboard,feature1,feature2").
 */
function parseFlags(flagsEnv: string): string[] {
  return flagsEnv
    .split(',')
    .map((flag) => flag.trim())
    .filter(Boolean);
}

// -----------------------------------------------------------------------------
// Configuration Generation
// -----------------------------------------------------------------------------

const oidcProviderUrl = getEnv('OIDC_PROVIDER_URL');
const authRedirectUrl = getEnv('AUTH_REDIRECT_URL');
const authClientId = getEnv('AUTH_CLIENT_ID');
const authScopes = getEnv('AUTH_SCOPES');
const uiBasePath = getEnv('UI_BASE_PATH');
const flags = parseFlags(getEnv('FLAGS'));

const runtimeConfiguration = {
  kind: 'MicroAppRuntimeConfiguration',
  apiVersion: 'ui.scality.com/v1alpha1',
  metadata: {
    kind: 'metalk8s-ui',
    name: 'metalk8s.eu-west-1',
  },
  spec: {
    title: 'MetalK8s Platform',
    selfConfiguration: {
      // Kubernetes API proxy endpoint
      url: '/api/kubernetes',
      // Salt API proxy endpoint
      url_salt: '/api/salt',
      // Prometheus API proxy endpoint
      url_prometheus: '/api/prometheus',
      // Grafana dashboard endpoint
      url_grafana: '/grafana',
      // Documentation endpoint
      url_doc: '/docs',
      // Alertmanager API proxy endpoint
      url_alertmanager: '/api/alertmanager',
      // Loki API proxy endpoint
      url_loki: '/api/loki',
      // Feature flags
      flags,
      // Base path for the UI
      ui_base_path: uiBasePath,
      // Support URL for user assistance
      url_support: 'https://github.com/scality/metalk8s/discussions/new',
    },
    auth: {
      kind: 'OIDC',
      providerUrl: oidcProviderUrl,
      redirectUrl: authRedirectUrl,
      clientId: authClientId,
      responseType: 'code',
      scopes: authScopes,
      providerLogout: true,
    },
  },
};

// -----------------------------------------------------------------------------
// File Output
// -----------------------------------------------------------------------------

const outputPath = path.join(
  __dirname,
  'public/.well-known/dev.runtime-app-configuration',
);

// Ensure the output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(runtimeConfiguration, null, 2));

console.log(`Runtime configuration generated successfully at: ${outputPath}`);
console.log('Configuration summary:');
console.log(`  - OIDC Provider: ${oidcProviderUrl}`);
console.log(`  - Redirect URL:  ${authRedirectUrl}`);
console.log(`  - Client ID:     ${authClientId}`);
console.log(`  - UI Base Path:  ${uiBasePath}`);
console.log(`  - Flags:         ${flags.join(', ')}`);
