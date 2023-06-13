import React from 'react';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import AlertProvider from '../../containers/AlertProvider';
import { Provider } from 'react-redux';
import { applyMiddleware, compose, createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';
import reducer from '../../ducks/reducer';
import translations_en from '../../translations/en.json';
import { MemoryRouter, Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { MetricsTimeSpanProvider } from '@scality/core-ui/dist/components/linetemporalchart/MetricTimespanProvider';
import StartTimeProvider from '../../containers/StartTimeProvider';
import { ConfigContext } from '../../FederableApp';

const composeEnhancers =
  typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;
const sagaMiddleware = createSagaMiddleware();
const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
export const store = createStore(reducer, enhancer);
export const waitForLoadingToFinish = () =>
  waitForElementToBeRemoved(
    () => [
      ...screen.queryAllByLabelText(/loading/i),
      ...screen.queryAllByText(/loading/i),
    ],
    {
      timeout: 4000,
    },
  );

const metalK8sConfig = {
  url: '/api/kubernetes',
  url_salt: '/api/salt',
  url_prometheus: '/api/prometheus',
  url_grafana: '/grafana',
  url_doc: '/docs',
  url_alertmanager: '/api/alertmanager',
  url_loki: '/api/loki',
  flags: ['dashboard'],
  ui_base_path: '/platform',
  url_support: 'https://github.com/scality/metalk8s/discussions/new',
};
export const AllTheProviders = (
  initialPath: string = '/',
  metalk8sConfig = metalK8sConfig,
) => {
  return ({ children }: { children: React.ReactNode }) => {
    const history = createMemoryHistory();
    history.push(initialPath);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // ✅ turns retries off
          retry: false,
        },
      },
    });
    const theme = {
      brand: {
        alert: '#FFE508',
        base: '#7B7B7B',
        primary: '#1D1D1D',
        primaryDark1: '#171717',
        primaryDark2: '#0A0A0A',
        secondary: '#055DFF',
        secondaryDark1: '#1C3D59',
        secondaryDark2: '#1C2E3F',
        success: '#006F62',
        healthy: '#30AC26',
        healthyLight: '#69E44C',
        warning: '#FFC10A',
        danger: '#AA1D05',
        critical: '#BE321F',
        background: '#121212',
        backgroundBluer: '#192A41',
        textPrimary: '#FFFFFF',
        textSecondary: '#B5B5B5',
        textTertiary: '#DFDFDF',
        borderLight: '#A5A5A5',
        border: '#313131',
        info: '#434343',
      },
    };

    return (
      <Router history={history}>
        <IntlProvider locale="en" messages={translations_en}>
          <Provider store={store}>
            <QueryClientProvider client={queryClient}>
              <MetricsTimeSpanProvider>
                <StartTimeProvider>
                  <AlertProvider>
                    <ThemeProvider theme={theme}>
                      <ConfigContext.Provider value={metalk8sConfig}>
                        {children}
                      </ConfigContext.Provider>
                    </ThemeProvider>
                  </AlertProvider>
                </StartTimeProvider>
              </MetricsTimeSpanProvider>
            </QueryClientProvider>
          </Provider>
        </IntlProvider>
      </Router>
    );
  };
};

const customRender = (ui: React.ReactNode, options = {}) =>
  render(ui, {
    wrapper: AllTheProviders(),
    ...options,
  });

// re-export everything
export * from '@testing-library/react';
// override render method
export { customRender as render };
// use this fake control to initialize the APIs and retrieve the data from the APIs.
export const FAKE_CONTROL_PLANE_IP = 'fake.control.plane.ip.invalid';
