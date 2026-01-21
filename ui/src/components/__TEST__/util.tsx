import { ToastProvider } from '@scality/core-ui';
import { MetricsTimeSpanProvider } from '@scality/core-ui/dist/next';
import { coreUIAvailableThemes } from '@scality/core-ui/dist/style/theme';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import type React from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClient } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { applyMiddleware, compose, createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { StyleSheetManager, type StylisPlugin, ThemeProvider } from 'styled-components';
import AlertProvider from '../../containers/AlertProvider';
import StartTimeProvider from '../../containers/StartTimeProvider';
import reducer from '../../ducks/reducer';
import { QueryClientProvider } from '../../QueryClientProvider';
import translations_en from '../../translations/en.json';

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
  waitForElementToBeRemoved(() => [...screen.queryAllByLabelText(/loading/i), ...screen.queryAllByText(/loading/i)], {
    timeout: 4000,
  });

/**
 * StyleSheetManager + simplifiedStylesPlugin will remove <style> at the top
 * of the <head> tag, this will significantly reduce the time of your test when
 * you use `getByRole` of react testing library.
 */
const ALLOWED_RULES = ['display', 'visibility', 'pointer-events'];
const simplifiedStylesPlugin: StylisPlugin = (context, content) => {
  if (context === 1) {
    if (!ALLOWED_RULES.some((rule) => content.toString().startsWith(`${rule}:`))) {
      return '';
    }
  }

  return undefined;
};

export const metalK8sConfig = {
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
export const AllTheProviders = (initialPath: string = '/') => {
  return ({ children }: { children: React.ReactNode }) => {
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
      console.log('JEST_PREVIEW is on');
      return (
        <MemoryRouter initialEntries={[initialPath]}>
          <IntlProvider locale="en" messages={translations_en}>
            <ToastProvider>
              <Provider store={buildStore()}>
                <QueryClientProvider client={queryClient}>
                  <MetricsTimeSpanProvider>
                    <StartTimeProvider>
                      <AlertProvider>
                        <ThemeProvider theme={theme}>{children}</ThemeProvider>
                      </AlertProvider>
                    </StartTimeProvider>
                  </MetricsTimeSpanProvider>
                </QueryClientProvider>
              </Provider>
            </ToastProvider>
          </IntlProvider>
        </MemoryRouter>
      );
    }

    return (
      <StyleSheetManager stylisPlugins={[simplifiedStylesPlugin]} disableVendorPrefixes>
        <MemoryRouter>
          <IntlProvider locale="en" messages={translations_en}>
            <ToastProvider>
              <Provider store={buildStore()}>
                <QueryClientProvider client={queryClient}>
                  <MetricsTimeSpanProvider>
                    <StartTimeProvider>
                      <AlertProvider>
                        <ThemeProvider theme={theme}>{children}</ThemeProvider>
                      </AlertProvider>
                    </StartTimeProvider>
                  </MetricsTimeSpanProvider>
                </QueryClientProvider>
              </Provider>
            </ToastProvider>
          </IntlProvider>
        </MemoryRouter>
      </StyleSheetManager>
    );
  };
};

const customRender = (ui: React.ReactNode, options = {}, providersArgs: [string] = ['/']) =>
  render(ui, {
    wrapper: AllTheProviders(...providersArgs),
    ...options,
  });

// re-export everything
export * from '@testing-library/react';
// override render method
export { customRender as render };
// use this fake control to initialize the APIs and retrieve the data from the APIs.
export const FAKE_CONTROL_PLANE_IP = 'fake.control.plane.ip.invalid';
