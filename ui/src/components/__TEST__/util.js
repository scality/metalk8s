import React from 'react';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import AlertProvider from '../../containers/AlertProvider';
import AlertHistoryProvider from '../../containers/AlertHistoryProvider';

export const waitForLoadingToFinish = () =>
  waitForElementToBeRemoved(
    () => [
      ...screen.queryAllByLabelText(/loading/i),
      ...screen.queryAllByText(/loading/i),
    ],
    { timeout: 4000 },
  );

const AllTheProviders = ({ children }) => {
  const queryClient = new QueryClient();
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
    <QueryClientProvider client={queryClient}>
      <AlertProvider>
        <AlertHistoryProvider>
          <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </AlertHistoryProvider>
      </AlertProvider>
    </QueryClientProvider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };
