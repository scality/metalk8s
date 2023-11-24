import { render, screen } from '@testing-library/react';
import ActiveAlertsFilter from './ActiveAlertsFilters';
import { MemoryRouter, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from 'react-query';
import userEvent from '@testing-library/user-event';

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
        <MemoryRouter>
          <ActiveAlertsFilter />
          <UrlChecker />
        </MemoryRouter>
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
