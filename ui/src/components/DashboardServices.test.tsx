import { screen } from '@testing-library/react';
import { STATUS_CRITICAL, STATUS_HEALTH, STATUS_WARNING } from '../constants';
import { useHighestSeverityAlerts } from '../containers/AlertProvider';
import DashboardServices from './DashboardServices';
import { render } from './__TEST__/util';
const alertsCritical = [
  {
    id: 'alert1',
    severity: STATUS_CRITICAL,
    startsAt: '2021-07-28T10:36:24.293Z',
  },
];
const alertsWarning = [
  {
    id: 'alert2',
    severity: STATUS_WARNING,
    startsAt: '2021-07-28T10:36:24.293Z',
  },
];
const noAlerts = [];
jest.mock('../containers/ConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
  useLinkOpener: () => ({
    openLink: jest.fn(),
  }),
  useDiscoveredViews: () => [
    {
      app: {
        kind: '',
        name: '',
        version: '',
        url: '',
        appHistoryBasePath: '',
      },
      isFederated: true,
      view: {
        path: '/alerts',
      },
    },
  ],
}));
describe('the dashboard inventory panel', () => {
  test('displays the services panel and display all 8 green statuses when no alerts are present', async () => {
    // Have to any type jest.fn function to avoid Flow warning for mockImplementation()
    (useHighestSeverityAlerts as any).mockImplementation(() => noAlerts);
    // Render
    render(<DashboardServices />);
    // Verify
    expect(
      screen.getAllByLabelText(`Check-circle status ${STATUS_HEALTH}`),
    ).toHaveLength(8);
  });
  test('displays the services panel and display all 8 warning statuses when warning alerts are present as well as link to the alerts page', async () => {
    // Have to any type jest.fn function to avoid Flow warning for mockImplementation()
    (useHighestSeverityAlerts as any).mockImplementation(() => alertsWarning);
    // Render
    render(<DashboardServices />);
    // Verify
    expect(
      screen.getAllByLabelText(`Exclamation-circle status ${STATUS_WARNING}`),
    ).toHaveLength(8);
    expect(screen.getAllByTestId('alert-link')).toHaveLength(8);
  });
  test('displays the services panel and display all 8 critical statuses when warning alerts are present as well as link to the alerts page', async () => {
    // Have to any type jest.fn function to avoid Flow warning for mockImplementation()
    (useHighestSeverityAlerts as any).mockImplementation(() => alertsCritical);
    // Render
    render(<DashboardServices />);
    // Verify
    expect(
      screen.getAllByLabelText(`Times-circle status ${STATUS_CRITICAL}`),
    ).toHaveLength(8);
    expect(screen.getAllByTestId('alert-link')).toHaveLength(8);
  });
});
