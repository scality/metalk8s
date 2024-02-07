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
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { StyleSheetManager, StylisPlugin } from 'styled-components';
import { MetricsTimeSpanProvider } from '@scality/core-ui/dist/components/linetemporalchart/MetricTimespanProvider';

import reducer from '../../ducks/reducer';
import translations_en from '../../translations/en.json';
import StartTimeProvider from '../../containers/StartTimeProvider';
import { ConfigContext } from '../../FederableApp';
import { coreUIAvailableThemes } from '@scality/core-ui/dist/style/theme';

const composeEnhancers =
  // @ts-expect-error - FIXME when you are working on it
  typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? // @ts-expect-error - FIXME when you are working on it
      window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;
const sagaMiddleware = createSagaMiddleware();
const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
export const buildStore = () => createStore(reducer, enhancer);
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

/**
 * StyleSheetManager + simplifiedStylesPlugin will remove <style> at the top
 * of the <head> tag, this will significantly reduce the time of your test when
 * you use `getByRole` of react testing library.
 */
const ALLOWED_RULES = ['display', 'visibility', 'pointer-events'];
const simplifiedStylesPlugin: StylisPlugin = (context, content) => {
  if (context === 1) {
    if (
      !ALLOWED_RULES.some((rule) => content.toString().startsWith(`${rule}:`))
    ) {
      return '';
    }
  }

  return undefined;
};

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
    const theme = coreUIAvailableThemes.darkRebrand;

    // When you use jest-preview, you need to set the environment variable JEST_PREVIEW at on.
    if (process.env.JEST_PREVIEW === 'on') {
      return (
        <Router history={history}>
          <IntlProvider locale="en" messages={translations_en}>
            <Provider store={buildStore()}>
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
    }

    return (
      <StyleSheetManager
        stylisPlugins={[simplifiedStylesPlugin]}
        disableVendorPrefixes
      >
        <Router history={history}>
          <IntlProvider locale="en" messages={translations_en}>
            <Provider store={buildStore()}>
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
      </StyleSheetManager>
    );
  };
};

const customRender = (ui: React.ReactNode, options = {}) =>
  // @ts-expect-error - FIXME when you are working on it
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
