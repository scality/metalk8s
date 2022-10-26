import { AllTheProviders, render } from './__TEST__/util';
import DashboardAlerts from './DashboardAlerts';
import { fireEvent } from '@testing-library/react';
import { useAlerts, useAlertLibrary } from '../containers/AlertProvider';
const topLevelAlert = [
  {
    id: '3',
    severity: 'critical',
    labels: {
      alertname: 'ClusterAtRisk',
      severity: 'critical',
    },
    childrenJsonPath:
      "$[?((@.labels.alertname === 'NodeAtRisk' && @.labels.severity === 'critical') || (@.labels.alertname === 'PlatformServicesAtRisk' && @.labels.severity === 'critical') || (@.labels.alertname === 'VolumeAtRisk' && @.labels.severity === 'critical'))]",
  },
];
const alerts = [
  {
    id: '1',
    severity: 'critical',
    labels: {
      alertname: 'VolumeAtRisk',
      severity: 'critical',
    },
    childrenJsonPath:
      "$[?((@.labels.alertname === 'KubePersistentVolumeFillingUp' && @.labels.severity === 'critical') || (@.labels.alertname === 'KubePersistentVolumeErrors' && @.labels.severity === 'critical'))]",
  },
  {
    id: '2',
    severity: 'critical',
    labels: {
      alertname: 'KubePersistentVolumeFillingUp',
      severity: 'critical',
    },
    childrenJsonPath: '',
  },
  ...topLevelAlert,
];
const mockOpenLink = jest.fn();
jest.mock('../containers/AlertProvider', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
  useAlerts: jest.fn(),
  useAlertLibrary: jest.fn(),
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
      view: {
        path: '/alerts',
      },
    },
  ],
}));
describe('the dashboard alerts sub-panel', () => {
  beforeEach(() => {
    mockOpenLink.mockReset();
  });
  test('should display the number of alerts', () => {
    (useAlertLibrary as any).mockImplementation(() => ({
      getPlatformAlertSelectors: () => {
        return {
          alertname: ['ClusterAtRisk', 'ClusterDegraded'],
        };
      },
    }));
    // topLevelAlerts
    (useAlerts as any).mockImplementationOnce(() => ({
      alerts: topLevelAlert,
    }));
    // all the alerts
    (useAlerts as any).mockImplementationOnce(() => ({
      alerts: alerts,
    }));
    const { getByTestId } = render(<DashboardAlerts />, {
      wrapper: AllTheProviders,
    });
    expect(getByTestId('all-alert-badge')).toHaveTextContent('1');
    expect(getByTestId('warning-alert-badge')).toHaveTextContent('0');
    expect(getByTestId('critical-alert-badge')).toHaveTextContent('1');
    expect(getByTestId('view-all-link')).toBeInTheDocument();
  });
  test('should display no active alerts message if there is no alert', () => {
    (useAlerts as any).mockImplementation(() => ({
      alerts: [],
    }));
    const { queryByTestId, getByTestId, getByText } = render(
      <DashboardAlerts />,
      {
        wrapper: AllTheProviders,
      },
    );
    expect(getByText('No active alerts')).toBeInTheDocument();
    expect(getByTestId('all-alert-badge')).toHaveTextContent('0');
    expect(queryByTestId('warning-alert-badge')).not.toBeInTheDocument();
    expect(queryByTestId('critical-alert-badge')).not.toBeInTheDocument();
    expect(queryByTestId('view-all-link')).not.toBeInTheDocument();
  });
  test('should redirect to alert page with View All link', () => {
    (useAlerts as any).mockImplementation(() => ({
      alerts: alerts,
    }));
    const { getByTestId } = render(<DashboardAlerts />, {
      wrapper: AllTheProviders,
    });
    const viewAllLink = getByTestId('view-all-link');
    fireEvent.click(viewAllLink);
    expect(mockOpenLink).toHaveBeenCalledTimes(1);
    expect(mockOpenLink).toHaveBeenCalledWith(
      expect.objectContaining({
        view: {
          path: '/alerts',
        },
      }),
    );
  });
});