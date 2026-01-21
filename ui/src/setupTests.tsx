import fetch from 'node-fetch';
import { setupMock as setupLocalStorageMock } from './tests/mocks/localStorage';
import '@testing-library/jest-dom/extend-expect';
import 'babel-polyfill';
import type React from 'react';
import type { JSX } from 'react';
import { TextDecoder, TextEncoder } from 'util';
import type { Alert } from './services/alertUtils';

setupLocalStorageMock();

window.fetch = (url, ...rest) =>
  fetch(
    // @ts-expect-error - FIXME when you are working on it
    /^https?:/.test(url) ? url : new URL(url, 'http://localhost').toString(),
    ...rest,
  );

jest.mock('./FederableApp', () => {
  const original = jest.requireActual('./FederableApp');

  const metalK8sConfig = {
    url: '/api/kubernetes',
    url_salt: '/api/salt',
    url_prometheus: '/api/prometheus',
    url_grafana: '/grafana',
    url_doc: '/docs',
    url_alertmanager: '/api/alertmanager',
    url_loki: '/api/loki',
    flags: ['dashboard', 'show_node_display_name'],
    ui_base_path: '/platform',
    url_support: 'https://github.com/scality/metalk8s/discussions/new',
  };
  return {
    ...original,
    useConfig: jest.fn(() => {
      return metalK8sConfig;
    }),
  };
});

jest.mock('./containers/ConfigProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./containers/AlertProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useHighestSeverityAlerts: jest.fn(),
  useAlerts: jest.fn(),
  useAlertLibrary: jest.fn(() => {
    return {
      getNodesAlertSelectors: jest.fn(),
      getVolumesAlertSelectors: jest.fn(),
      getNetworksAlertSelectors: jest.fn(),
      getServicesAlertSelectors: jest.fn(),
      getK8SMasterAlertSelectors: jest.fn(),
      getBootstrapAlertSelectors: jest.fn(),
      getMonitoringAlertSelectors: jest.fn(),
      getAlertingAlertSelectors: jest.fn(),
      getLoggingAlertSelectors: jest.fn(),
      getDashboardingAlertSelectors: jest.fn(),
      getIngressControllerAlertSelectors: jest.fn(),
      getAuthenticationAlertSelectors: jest.fn(),

      useHighestSeverityAlerts: jest.fn(),
      useAlerts: jest.fn(),
    };
  }),
  highestAlertToStatus: (alerts?: Alert[]): string => {
    return (alerts?.[0] && (alerts[0].severity as any as string)) || 'healthy';
  },
}));

jest.mock('./containers/PrivateRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: jest.fn(() => {
    return {
      userData: {
        id: 'xxx-yyy-zzzz-id',
        token: 'xxx-yyy-zzz-token',
        username: 'Renard ADMIN',
        email: 'renard.admin@scality.com',
        groups: ['StorageManager', 'user', 'PlatformAdmin'],
      },
      getToken: () => Promise.resolve('xxx-yyy-zzz-token'),
    };
  }),
  useShellConfig: jest.fn(() => {
    return {
      config: {
        navbar: {
          main: [
            {
              kind: 'artesca-base-ui',
              view: 'overview',
            },
            {
              kind: 'artesca-base-ui',
              view: 'identity',
            },
            {
              kind: 'metalk8s-ui',
              view: 'platform',
            },
            {
              kind: 'xcore-ui',
              view: 'storageservices',
            },
            {
              kind: 'metalk8s-ui',
              view: 'alerts',
            },
          ],
          subLogin: [
            {
              kind: 'artesca-base-ui',
              view: 'certificates',
            },
            {
              kind: 'artesca-base-ui',
              view: 'about',
            },
            {
              kind: 'artesca-base-ui',
              view: 'license',
              icon: 'License',
            },
          ],
        },
        discoveryUrl: '/shell/deployed-ui-apps.json',
        productName: 'MetalK8s',
      },
      favicon: '/navbar/artesca-favicon.svg',
      themes: {
        dark: { logoPath: '/logo.svg' },
      },
      status: 'success',
    };
  }),
}));

export const mockShellHooks = {
  useAuthConfig: jest.fn(),
  useAuth: jest.fn(() => ({
    userData: {
      token: 'xxx',
      original: {
        session_state: 'session-state-1',
      },
      groups: ['StorageManager'],
    },
    getToken: () => Promise.resolve('xxx'),
  })),
  useConfigRetriever: jest.fn(() => {
    return {
      retrieveConfiguration: jest.fn(() => {
        return {
          spec: {
            remoteEntryPath: '/remoteEntry.js',
          },
        };
      }),
    };
  }),
  useDiscoveredViews: jest.fn(),
  useShellConfig: jest.fn(),
  useLanguage: jest.fn(),
  useConfig: jest.fn(),
  useLinkOpener: jest.fn(() => {
    return { openLink: jest.fn() };
  }),
  useDeployedApps: jest.fn(() => {
    return [
      {
        kind: 'zenko-ui',
        name: 'zenko-ui.eu-west-1',
        version: 'local-dev',
        url: 'http://127.0.0.1:8383/zenko',
        appHistoryBasePath: '/data',
      },
    ];
  }),
  useShellThemeSelector: jest.fn(() => {
    return {
      theme: 'dark',
      setTheme: jest.fn(),
    };
  }),
  useNotificationCenter: jest.fn(),
};

export const mockShellAlerts = {
  AlertsProvider: ({ alertManagerUrl, children }: { alertManagerUrl: string; children: JSX.Element }) => (
    <>{children}</>
  ),
  alertHooks: {
    useAlerts: jest.fn(),
    useHighestSeverityAlerts: jest.fn(),
  },
  alertSelectors: {
    getPlatformAlertSelectors: jest.fn(),
    getNodesAlertSelectors: jest.fn(),
    getVolumesAlertSelectors: jest.fn(),
    getNetworksAlertSelectors: jest.fn(),
    getServicesAlertSelectors: jest.fn(),
    getK8SMasterAlertSelectors: jest.fn(),
    getBootstrapAlertSelectors: jest.fn(),
    getMonitoringAlertSelectors: jest.fn(),
    getAlertingAlertSelectors: jest.fn(),
    getLoggingAlertSelectors: jest.fn(),
    getDashboardingAlertSelectors: jest.fn(),
    getIngressControllerAlertSelectors: jest.fn(),
    getAuthenticationAlertSelectors: jest.fn(),
  },
};

jest.mock('@scality/module-federation', () => {
  const original = jest.requireActual('@scality/module-federation');
  const router = jest.requireActual('react-router');
  return {
    ...original,
    useCurrentApp: jest.fn(() => {
      return {
        kind: 'metalk8s-ui',
        view: 'platform',
        appHistoryBasePath: '',
      };
    }),
    useBasenameRelativeNavigate: router.useNavigate,
    ShellHooksProvider: ({ children }) => <>{children}</>,
    useShellHooks: () => mockShellHooks,
    useShellAlerts: () => mockShellAlerts,
  };
});

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;
