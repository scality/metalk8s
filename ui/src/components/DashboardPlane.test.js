//@flow
import React from 'react';
import { screen } from '@testing-library/react';
import DashboardPlaneHealth from './DashboardPlaneHealth';
import { render } from './__TEST__/util';
import type { Alert } from '../services/alertUtils';
import { useHighestSeverityAlerts } from '../containers/AlertProvider';
import {
  STATUS_WARNING,
  STATUS_CRITICAL,
  STATUS_HEALTH,
} from '../constants.js';

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

jest.mock('../containers/AlertProvider', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
  useHighestSeverityAlerts: jest.fn(),
  useAlertLibrary: () => ({
    getNetworksAlertSelectors: () => {},
  }),
  highestAlertToStatus: (alerts?: Alert[]): string => {
    return (alerts?.[0] && ((alerts[0].severity: any): string)) || 'healthy';
  },
}));

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
      view: { path: '/alerts' },
    },
  ],
}));

const NB_ITEMS = 2;

describe("the dashboard network's plane panel", () => {
  test("displays the network's plane panel and display 2 green statuses when no alerts are present", async () => {
    // Have to any type jest.fn function to avoid Flow warning for mockImplementation()
    (useHighestSeverityAlerts: any).mockImplementation(() => noAlerts);
    render(<DashboardPlaneHealth />);
    expect(screen.getAllByLabelText(`status ${STATUS_HEALTH}`)).toHaveLength(
      NB_ITEMS,
    );
  });

  test('displays 2 warning statuses when warning alerts are present as well as link to the alerts page', async () => {
    // Have to any type jest.fn function to avoid Flow warning for mockImplementation()
    (useHighestSeverityAlerts: any).mockImplementation(() => alertsWarning);

    // Render
    render(<DashboardPlaneHealth />);

    // Verify
    expect(screen.getAllByLabelText(`status ${STATUS_WARNING}`)).toHaveLength(
      NB_ITEMS,
    );
    expect(screen.getAllByTestId('alert-link')).toHaveLength(NB_ITEMS);
  });

  test('displays 2 critical statuses when warning alerts are present as well as link to the alerts page', async () => {
    // Have to any type jest.fn function to avoid Flow warning for mockImplementation()
    (useHighestSeverityAlerts: any).mockImplementation(() => alertsCritical);

    // Render
    render(<DashboardPlaneHealth />);

    // Verify
    expect(screen.getAllByLabelText(`status ${STATUS_CRITICAL}`)).toHaveLength(
      NB_ITEMS,
    );
    expect(screen.getAllByTestId('alert-link')).toHaveLength(NB_ITEMS);
  });
});
