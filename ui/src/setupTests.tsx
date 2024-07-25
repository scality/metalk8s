import fetch from 'node-fetch';
import { setupMock as setupLocalStorageMock } from './tests/mocks/localStorage';
import '@testing-library/jest-dom/extend-expect';
import 'babel-polyfill';
import { Alert } from './services/alertUtils';
import React from 'react';
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
