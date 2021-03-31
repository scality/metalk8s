import React from 'react';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import AlertProvider from '../../containers/AlertProvider';

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
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
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

// use this fake control to initialize the APIs and retrieve the data from the APIs.
export const FAKE_CONTROL_PLANE_IP = 'fake.control.plane.ip.invalid';
