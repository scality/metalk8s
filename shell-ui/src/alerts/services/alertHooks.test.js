import '../library';
import React, { createContext, useContext } from 'react';
import packageJson from '../../../package.json';
const { version } = packageJson;
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { AlertProvider } from '../AlertProvider.js';
import { useHighestSeverityAlerts } from './alertHooks';
import { afterAll, beforeAll, jest } from '@jest/globals';

const testService = 'http://10.0.0.1/api/alertmanager';

const server = setupServer(
  rest.get(`${testService}/api/v2/alerts`, (req, res, ctx) => {
    const alerts = [
      {
        annotations: {
          description:
            'Filesystem on /dev/vdc at 192.168.1.29:9100 has only 3.13% available space left.',
          runbook_url:
            'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutofspace',
          summary: 'Filesystem has less than 5% space left.',
        },
        endsAt: new Date(
          new Date().getTime() + 1000 * 60 * 60 * 24,
        ).toISOString(),
        fingerprint: '37b2591ac3cdb320',
        startsAt: '2021-01-25T09:12:05.358Z',
        updatedAt: '2021-01-29T07:36:11.363Z',
        generatorURL:
          'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=%28node_filesystem_avail_bytes%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%2F+node_filesystem_size_bytes%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%2A+100+%3C+5+and+node_filesystem_readonly%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%3D%3D+0%29&g0.tab=1',
        labels: {
          alertname: 'VolumeDegraded',
          severity: 'warning',
        },
      },
      {
        annotations: {
          description:
            'Filesystem on /dev/vdc at 192.168.1.29:9100 has only 3.13% available space left.',
          runbook_url:
            'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutofspace',
          summary: 'Filesystem has less than 5% space left.',
        },
        endsAt: new Date(
          new Date().getTime() + 1000 * 60 * 60 * 24,
        ).toISOString(),
        fingerprint: '37b2591ac3cdb320',
        startsAt: '2021-01-25T09:12:05.358Z',
        updatedAt: '2021-01-29T07:36:11.363Z',
        generatorURL:
          'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=%28node_filesystem_avail_bytes%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%2F+node_filesystem_size_bytes%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%2A+100+%3C+5+and+node_filesystem_readonly%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%3D%3D+0%29&g0.tab=1',
        labels: {
          alertname: 'VolumeAtRisk',
          severity: 'critical',
        },
      },
    ];
    return res(ctx.json(alerts));
  }),
);

describe('useHighestSeverityAlerts hook', () => {
  jest.useFakeTimers();
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());

  const alertLibrary = window.shellUIAlerts[version];
  alertLibrary.createAlertContext(createContext);

  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      <AlertProvider alertManagerUrl={testService}>{children}</AlertProvider>
    </QueryClientProvider>
  );
  const AlertProvider = alertLibrary.AlertProvider(useQuery);
  const useAlerts = alertLibrary.useAlerts(useContext);

  it('should only get the VolumeAtRisk alert when both VolumeAtRisk and VolumeDegraded are active', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () =>
        useHighestSeverityAlerts(useContext, {
          alertname: ['VolumeAtRisk', 'VolumeDegraded'],
        }),
      { wrapper },
    );
    // E
    await waitForNextUpdate();
    // V
    expect(result.current[0].labels.alertname).toEqual('VolumeAtRisk');
    expect(result.current.length).toEqual(1);
  });

  it('should get empty array', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () =>
        useHighestSeverityAlerts(useContext, {
          alertname: ['NodeAtRisk', 'NodeDegraded'],
        }),
      { wrapper },
    );
    // E
    await waitForNextUpdate();
    // V
    expect(result.current).toEqual([]);
  });

  afterAll(() => {
    server.close();
  });
});
