import { CoreUiThemeProvider } from '@scality/core-ui/dist/next';
import { coreUIAvailableThemes } from '@scality/core-ui/dist/style/theme';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { QueryClient } from 'react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { STATUS_CRITICAL, STATUS_WARNING } from '../constants';
import { QueryClientProvider } from '../QueryClientProvider';
import ActiveAlertsCounter from './ActiveAlertsCounter';

const AlertsPage = () => {
  const location = useLocation();
  return (
    <div data-testid="alerts-page">
      Alerts page
      <span data-testid="alerts-search">{location.search}</span>
    </div>
  );
};

const defaultProps = {
  criticalCounter: 3,
  warningCounter: 5,
};

const initialPath = '/nodes/node1/overview';

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={new QueryClient()}>
    <CoreUiThemeProvider theme={coreUIAvailableThemes.darkRebrand}>
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    </CoreUiThemeProvider>
  </QueryClientProvider>
);

const renderWithRoutes = () =>
  render(
    <Routes>
      <Route path="/nodes/:nodeName/overview" element={<ActiveAlertsCounter {...defaultProps} />} />
      <Route path="/nodes/:nodeName/alerts" element={<AlertsPage />} />
      <Route path="/alerts" element={<AlertsPage />} />
    </Routes>,
    { wrapper },
  );

describe('ActiveAlertsCounter', () => {
  it('displays critical and warning counts', () => {
    renderWithRoutes();

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('navigates to alerts page with severity=critical when Critical counter is clicked', async () => {
    const { container } = renderWithRoutes();

    const criticalCounter = container.querySelector('[data-cy="critical_counter_node"]');
    if (!criticalCounter) throw new Error('critical counter not found');
    await act(async () => {
      await userEvent.click(criticalCounter);
    });

    await waitFor(() => {
      expect(screen.getByTestId('alerts-page')).toBeInTheDocument();
    });
    expect(screen.getByText('Alerts page')).toBeInTheDocument();
    expect(screen.getByTestId('alerts-search')).toHaveTextContent(`?severity=${STATUS_CRITICAL}`);
  });

  it('navigates to alerts page with severity=warning when Warning counter is clicked', async () => {
    const { container } = renderWithRoutes();

    const warningCounter = container.querySelector('[data-cy="warning_counter_node"]');
    if (!warningCounter) throw new Error('warning counter not found');
    await act(async () => {
      await userEvent.click(warningCounter);
    });

    await waitFor(() => {
      expect(screen.getByTestId('alerts-page')).toBeInTheDocument();
    });
    expect(screen.getByText('Alerts page')).toBeInTheDocument();
    expect(screen.getByTestId('alerts-search')).toHaveTextContent(`?severity=${STATUS_WARNING}`);
  });
});
