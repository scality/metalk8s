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
import translations_en from '../../translations/en';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import ConfigProvider from '../../containers/ConfigProvider';

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
    { timeout: 4000 },
  );

const AllTheProviders = ({ children }) => {
  const history = createMemoryHistory();

  const queryClient = new QueryClient();
  const theme = {
    brand: {
      statusHealthy: '#009E93',
      statusWarning: '#E77B00',
      statusCritical: '#C10004',
      selectedActive: '#90D0FF',
      highlight: '#E3F2FD',
      border: '#898989',
      buttonPrimary: '#9DA6EC',
      buttonSecondary: '#CACFE3',
      buttonDelete: '#FFCDD2',
      infoPrimary: '#5C486D',
      infoSecondary: '#EBE3F1',
      backgroundLevel1: '#F9F9FB',
      backgroundLevel2: '#F3F3F5',
      backgroundLevel3: '#EAEAEC',
      backgroundLevel4: '#DBDBDD',
      textPrimary: '#101010',
      textSecondary: '#515170',
      textReverse: '#EAEAEA',
      textLink: '#1349C5',
    },
  };
  return (
    <Router history={history}>
      <IntlProvider locale="en" messages={translations_en}>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ConfigProvider>
              <AlertProvider>
                <ThemeProvider theme={theme}>{children}</ThemeProvider>
              </AlertProvider>
            </ConfigProvider>
          </QueryClientProvider>
        </Provider>
      </IntlProvider>
    </Router>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };

// use this fake control to initialize the APIs and retrieve the data from the APIs.
export const FAKE_CONTROL_PLANE_IP = 'fake.control.plane.ip.invalid';
