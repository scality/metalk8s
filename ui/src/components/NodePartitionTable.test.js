//@flow
import React from 'react';
import { screen } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import NodePartitionTable from './NodePartitionTable';
import { waitForLoadingToFinish, render } from './__TEST__/util';
import { initialize as initializeProm } from '../services/prometheus/api';
import { initialize as initializeAM } from '../services/alertmanager/api';

const server = setupServer(
  rest.get(
    'http://192.168.1.18:8443/api/prometheus/api/v1/query',
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

  rest.get(
    'http://192.168.1.18:8443/api/alertmanager/api/v2/alerts',
    (req, res, ctx) => {
      const alerts = [
        {
          annotations: {
            description:
              'Filesystem on /dev/vdc at 192.168.1.29:9100 has only 3.13% available space left.',
            runbook_url:
              'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutofspace',
            summary: 'Filesystem has less than 5% space left.',
          },
          endsAt: '2021-01-29T07:40:05.358Z',
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
      return res(ctx.json(alerts));
    },
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('the partition table', async () => {
  // Setup

  // use fake timers to let react query retry immediately after promise failure
  jest.useFakeTimers();
  initializeProm('http://192.168.1.18:8443/api/prometheus');
  initializeAM('http://192.168.1.18:8443/api/alertmanager');

  const { getByLabelText } = render(
    <NodePartitionTable instanceIP={'192.168.1.29'} />,
  );
  expect(getByLabelText('loading')).toBeInTheDocument();

  // Exercise
  await waitForLoadingToFinish();

  // Verify
  expect(screen.getByLabelText('status warning')).toBeInTheDocument();
  expect(screen.getByLabelText('percentage')).toBeInTheDocument();
});

test('handles server error', async () => {
  // S
  jest.useFakeTimers();
  initializeProm('http://192.168.1.18:8443/api/prometheus');
  initializeAM('http://192.168.1.18:8443/api/alertmanager');
  // override the default route with error status
  server.use(
    rest.get(
      'http://192.168.1.18:8443/api/prometheus/api/v1/query',
      (req, res, ctx) => {
        return res(ctx.status(500));
      },
    ),
    rest.get(
      'http://192.168.1.18:8443/api/alertmanager/api/v2/alerts',
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
