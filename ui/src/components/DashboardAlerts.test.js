import { STATUS_CRITICAL, STATUS_WARNING } from '../constants';
import { render } from './__TEST__/util';
import DashboardAlerts from './DashboardAlerts';
import { fireEvent } from '@testing-library/react';
import { useAlerts } from '../containers/AlertProvider';

const alertsCritical = [
  {
    id: 'alert1',
    severity: STATUS_CRITICAL,
    labels: {},
  },
];

const alertsWarning = [
  {
    id: 'alert2',
    severity: STATUS_WARNING,
    labels: {},
  },
  {
    id: 'alert3',
    severity: STATUS_WARNING,
    labels: {},
  },
];

const mockOpenLink = jest.fn();

jest.mock('../containers/AlertProvider', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
  useAlerts: jest.fn(),
}));

jest.mock('../containers/ConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
  useLinkOpener: () => ({
    openLink: mockOpenLink,
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
      view: { path: '/alerts' },
    },
  ],
}));

describe('the dashboard alerts sub-panel', () => {
  beforeEach(() => {
    mockOpenLink.mockReset();
  });

  test('should display the number of alerts', () => {
    (useAlerts: any).mockImplementation(() => ({
      alerts: [...alertsWarning, ...alertsCritical],
    }));
    const { getByTestId } = render(<DashboardAlerts />);

    expect(getByTestId('all-alert-badge')).toHaveTextContent('3');
    expect(getByTestId('warning-alert-badge')).toHaveTextContent('2');
    expect(getByTestId('critical-alert-badge')).toHaveTextContent('1');
    expect(getByTestId('view-all-link')).toBeInTheDocument();
  });

  test('should display no active alerts message if there is no alert', () => {
    (useAlerts: any).mockImplementation(() => ({ alerts: [] }));
    const { queryByTestId, getByTestId, getByText } = render(
      <DashboardAlerts />,
    );

    expect(getByText('No active alerts')).toBeInTheDocument();
    expect(getByTestId('all-alert-badge')).toHaveTextContent('0');
    expect(queryByTestId('warning-alert-badge')).not.toBeInTheDocument();
    expect(queryByTestId('critical-alert-badge')).not.toBeInTheDocument();
    expect(queryByTestId('view-all-link')).not.toBeInTheDocument();
  });

  test('should redirect to alert page with View All link', () => {
    (useAlerts: any).mockImplementation(() => ({
      alerts: [...alertsWarning, ...alertsCritical],
    }));
    const { getByTestId } = render(<DashboardAlerts />);

    const viewAllLink = getByTestId('view-all-link');
    fireEvent.click(viewAllLink);
    expect(mockOpenLink).toHaveBeenCalledTimes(1);
    expect(mockOpenLink).toHaveBeenCalledWith(
      expect.objectContaining({
        view: { path: '/alerts' },
      }),
    );
  });
});
