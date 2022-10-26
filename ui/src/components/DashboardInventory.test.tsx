import React from 'react';
import { screen } from '@testing-library/react';
import DashboardInventory from './DashboardInventory';
import { waitForLoadingToFinish, render } from './__TEST__/util';
import type { Alert } from '../services/alertUtils';
import { useHighestSeverityAlerts } from '../containers/AlertProvider';
import {
  getNodesCountQuery,
  getVolumesCountQuery,
} from '../services/platformlibrary/k8s';
import { STATUS_WARNING, STATUS_CRITICAL, STATUS_HEALTH } from '../constants';
const alertsCritical = [
  {
    id: 'alert1',
    severity: 'critical',
  },
];
const alertsWarning = [
  {
    id: 'alert2',
    severity: 'warning',
  },
];
const noAlerts = [];
jest.mock('../services/platformlibrary/k8s.ts', () => ({
  __esModule: true,
  // Allows for the "default" import to work in the Mock injection
  default: ({ children }) => <>{children}</>,
  getNodesCountQuery: jest.fn(),
  getVolumesCountQuery: jest.fn(),
}));
jest.mock('../containers/AlertProvider', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
  useHighestSeverityAlerts: jest.fn(),
  useAlertLibrary: () => ({
    getNodesAlertSelectors: () => {},
    getVolumesAlertSelectors: () => {},
  }),
  highestAlertToStatus: (alerts?: Alert[]): string => {
    return (alerts?.[0] && (alerts[0].severity as any as string)) || 'healthy';
  },
}));
describe('the dashboard inventory panel', () => {
  beforeAll(() => {
    // Have to any type jest.fn function to avoid Flow warning for mockImplementation()
    (getVolumesCountQuery as any).mockImplementation(() => ({
      queryKey: 'countVolumes',
      queryFn: () => 4,
    }));
    (getNodesCountQuery as any).mockImplementation(() => ({
      queryKey: 'countNodes',
      queryFn: () => 6,
    }));
  });
  test('displays the inventory card and nodes/volumes counts', async () => {
    // Render
    render(<DashboardInventory />);
    // Loading
    await waitForLoadingToFinish();
    // Verify
    expect(screen.getByLabelText('inventory')).toBeInTheDocument();
    expect(screen.getByLabelText('nodes')).toBeInTheDocument();
    expect(screen.getByLabelText('volumes')).toBeInTheDocument();
    expect(screen.getByLabelText('6 nodes')).toBeInTheDocument();
    expect(screen.getByLabelText('4 volumes')).toBeInTheDocument();
  });
  test('displays properly the status CRITICAL for nodes and volumes', async () => {
    // Have to any type jest.fn function to avoid Flow warning for mockImplementation()
    (useHighestSeverityAlerts as any).mockImplementation(() => alertsCritical);
    // Render
    render(<DashboardInventory />);
    // Loading
    await waitForLoadingToFinish();
    // Verify
    expect(
      screen.getAllByLabelText(`Node-backend ${STATUS_CRITICAL}`).length,
    ).toEqual(1);
    expect(
      screen.getAllByLabelText(`Volume-backend ${STATUS_CRITICAL}`).length,
    ).toEqual(1);
  });
  test('displays properly the status WARNING for nodes and volumes', async () => {
    // Have to any type jest.fn function to avoid Flow warning for mockImplementation()
    (useHighestSeverityAlerts as any).mockImplementation(() => alertsWarning);
    // Render
    render(<DashboardInventory />);
    // Loading
    await waitForLoadingToFinish();
    // Verify
    expect(
      screen.getAllByLabelText(`Node-backend ${STATUS_WARNING}`).length,
    ).toEqual(1);
    expect(
      screen.getAllByLabelText(`Volume-backend ${STATUS_WARNING}`).length,
    ).toEqual(1);
  });
  test('displays properly the status HEALTHY for nodes and volumes', async () => {
    // Have to any type jest.fn function to avoid Flow warning for mockImplementation()
    (useHighestSeverityAlerts as any).mockImplementation(() => noAlerts);
    // Render
    render(<DashboardInventory />);
    // Loading
    await waitForLoadingToFinish();
    // Verify
    expect(
      screen.getAllByLabelText(`Node-backend ${STATUS_HEALTH}`).length,
    ).toEqual(1);
    expect(
      screen.getAllByLabelText(`Volume-backend ${STATUS_HEALTH}`).length,
    ).toEqual(1);
  });
  test('displays the loader if the query does not return a result', async () => {
    // Have to any type jest.fn function to avoid Flow warning for mockImplementation()
    (getVolumesCountQuery as any).mockImplementation(() => ({
      queryKey: 'countVolumes',
      queryFn: () => {},
    }));
    (getNodesCountQuery as any).mockImplementation(() => ({
      queryKey: 'countNodes',
      queryFn: () => {},
    }));
    // Render
    render(<DashboardInventory />);
    // Verify
    expect(screen.getAllByLabelText('loading').length).toEqual(2);
  });
});
