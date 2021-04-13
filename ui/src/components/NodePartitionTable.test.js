//@flow
import React from 'react';
import { screen } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import NodePartitionTable from './NodePartitionTable';
import {
  waitForLoadingToFinish,
  render,
  FAKE_CONTROL_PLANE_IP,
} from './__TEST__/util';
import { initialize as initializeProm } from '../services/prometheus/api';
import { initialize as initializeAM } from '../services/alertmanager/api';
import { initialize as initializeLoki } from '../services/loki/api';
import AlertProvider from '../containers/AlertProvider';

jest.mock('../containers/AlertProvider', () => ({
  __esModule: true, // this property makes it work
  default: ({ children }) => <>{children}</>,
  useAlerts: () => {
    const alerts = [
      {
        annotations: {
          description:
            'Filesystem on /dev/vdc at 192.168.1.29:9100 has only 3.13% available space left.',
          runbook_url:
            'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutofspace',
          summary: 'Filesystem has less than 5% space left.',
        },
        /*
        We want to have an active alert triggered, meaning the current time should be in between `startsAt` and `endsAt`.
        Since we can't spy on the `activeOn` in getHealthStatus(). If we use ```endsAt: new Date().toISOString()```, there will be a slightly difference between the two current times.
        Hence, here we add one day to make sure the alert is active.
        */
        endsAt: new Date(
          new Date().getTime() + 1000 * 60 * 60 * 24,
        ).toISOString(),
        fingerprint: '37b2591ac3cdb320',
        receivers: [
          {
            name: 'null',
          },
        ],
        startsAt: '2021-01-25T09:12:05.358Z',
        status: {
          inhibitedBy: [],
          silencedBy: [],
          state: 'active',
        },
        updatedAt: '2021-01-29T07:36:11.363Z',
        generatorURL:
          'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=%28node_filesystem_avail_bytes%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%2F+node_filesystem_size_bytes%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%2A+100+%3C+5+and+node_filesystem_readonly%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%3D%3D+0%29&g0.tab=1',
        labels: {
          alertname: 'NodeFilesystemAlmostOutOfSpace',
          container: 'node-exporter',
          device: '/dev/vdc',
          endpoint: 'metrics',
          fstype: 'xfs',
          instance: '192.168.1.29:9100',
          job: 'node-exporter',
          mountpoint: '/mnt/testpart',
          namespace: 'metalk8s-monitoring',
          pod: 'prometheus-operator-prometheus-node-exporter-wk86s',
          prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
          service: 'prometheus-operator-prometheus-node-exporter',
          severity: 'warning',
        },
      },
    ];
    return {alerts};
  },
}));

const server = setupServer(
  rest.get(
    `http://${FAKE_CONTROL_PLANE_IP}:8443/api/prometheus/api/v1/query`,
    (req, res, ctx) => {
      const result = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: {
                container: 'node-exporter',
                device: '/dev/vdc',
                endpoint: 'metrics',
                fstype: 'xfs',
                instance: '192.168.1.29:9100',
                job: 'node-exporter',
                mountpoint: '/mnt/testpart',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-wk86s',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1611905929.203, '96.86575443786982'],
            },
          ],
        },
      };
      // return success status
      return res(ctx.json(result));
    },
  ),
);

describe('the system partition table', () => {
  beforeAll(() => {
    server.listen();
  });

  test('displays the table', async () => {
    // Setup

    // use fake timers to let react query retry immediately after promise failure
    jest.useFakeTimers();
    initializeProm(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/prometheus`);
    initializeAM(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/alertmanager`);
    initializeLoki(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/loki`);

    const { getByLabelText } = render(
      <NodePartitionTable instanceIP={'192.168.1.29'} />,
    );
    expect(getByLabelText('loading')).toBeInTheDocument();

    // Exercise
    await waitForLoadingToFinish();

    // Verify
    expect(screen.getByLabelText('status warning')).toBeInTheDocument();
    expect(screen.getByLabelText('97%')).toBeInTheDocument();
    expect(screen.getByText('/mnt/testpart')).toBeInTheDocument();
    // since we use the same query, so the number of global size is the same as usage
    expect(screen.getByText('97Bytes')).toBeInTheDocument();
  });

  afterEach(() => server.resetHandlers());

  test('handles server error', async () => {
    // S
    jest.useFakeTimers();
    initializeProm(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/prometheus`);
    initializeAM(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/alertmanager`);

    // override the default route with error status
    server.use(
      rest.get(
        `http://${FAKE_CONTROL_PLANE_IP}:8443/api/prometheus/api/v1/query`,
        (req, res, ctx) => {
          return res(ctx.status(500));
        },
      ),
    );
    const { getByLabelText } = render(
      <NodePartitionTable instanceIP={'192.168.1.29'} />,
    );
    expect(getByLabelText('loading')).toBeInTheDocument();

    // E
    await waitForLoadingToFinish();

    // V
    expect(
      screen.getByText('System partitions request has failed.'),
    ).toBeInTheDocument();
  });

  afterAll(() => {
    server.close();
  });
});
