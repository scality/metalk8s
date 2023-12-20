import { CoreUiThemeProvider } from '@scality/core-ui/dist/next';
import { coreUIAvailableThemes } from '@scality/core-ui/dist/style/theme';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, useLocation } from 'react-router';
import ActiveAlertsFilter from './ActiveAlertsFilters';

describe('ActiveAlertsFilter', () => {
  it('should redirect on click', async () => {
    const SUT = jest.fn();
    const UrlChecker = () => {
      const location = useLocation();
      SUT(location);
      return null;
    };

    render(
      <QueryClientProvider client={new QueryClient()}>
        <CoreUiThemeProvider theme={coreUIAvailableThemes.darkRebrand}>
          <MemoryRouter>
            <ActiveAlertsFilter />
            <UrlChecker />
          </MemoryRouter>
        </CoreUiThemeProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(
      screen.getByRole('textbox', { name: 'Filter by severity' }),
    );
    await userEvent.click(screen.getByRole('option', { name: 'Critical' }));

    expect(SUT).toHaveBeenCalledWith(
      expect.objectContaining({
        search: '?severity=critical',
      }),
    );

    await userEvent.click(
      screen.getByRole('textbox', { name: 'Filter by severity' }),
    );
    await userEvent.click(screen.getByRole('option', { name: 'Warning' }));
    expect(SUT).toHaveBeenCalledWith(
      expect.objectContaining({
        search: '?severity=warning',
      }),
    );
  });
});
