import './index';
import packageJson from '../../package.json';
const { version } = packageJson;
import { render } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { renderHook } from '@testing-library/react-hooks';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { afterAll, beforeAll, jest } from '@jest/globals';
import { createContext, useContext } from 'react';
import { useQuery } from 'react-query';

const testService = 'http://10.0.0.1/api/alertmanager';

const alerts = [
  {
    annotations: {
      description:
        'Cluster has overcommitted CPU resource requests for Pods and cannot tolerate node failure.',
      runbook_url:
        'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubecpuovercommit',
      summary: 'Cluster has overcommitted CPU resource requests.',
    },
    endsAt: new Date(new Date().getTime() + 1000 * 60 * 60 * 24).toISOString(),
    fingerprint: '4b079d5d0a61b096',
    receivers: [{ name: 'null' }],
    startsAt: '2021-04-06T12:59:02.940Z',
    status: { inhibitedBy: [], silencedBy: [], state: 'active' },
    updatedAt: '2021-04-08T16:24:32.943Z',
    generatorURL:
      'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=sum%28namespace%3Akube_pod_container_resource_requests_cpu_cores%3Asum%29+%2F+sum%28kube_node_status_allocatable_cpu_cores%29+%3E+%28count%28kube_node_status_allocatable_cpu_cores%29+-+1%29+%2F+count%28kube_node_status_allocatable_cpu_cores%29\u0026g0.tab=1',
    labels: {
      alertname: 'KubeCPUOvercommit',
      prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
      severity: 'warning',
    },
  },
  {
    annotations: {
      description:
        'Cluster has overcommitted memory resource requests for Pods and cannot tolerate node failure.',
      runbook_url:
        'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubememoryovercommit',
      summary: 'Cluster has overcommitted memory resource requests.',
    },
    endsAt: new Date(new Date().getTime() + 1000 * 60 * 60 * 24).toISOString(),
    fingerprint: 'b038f46991b016ab',
    receivers: [{ name: 'null' }],
    startsAt: '2021-04-06T12:59:02.940Z',
    status: { inhibitedBy: [], silencedBy: [], state: 'active' },
    updatedAt: '2021-04-08T16:24:32.944Z',
    generatorURL:
      'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=sum%28namespace%3Akube_pod_container_resource_requests_memory_bytes%3Asum%29+%2F+sum%28kube_node_status_allocatable_memory_bytes%29+%3E+%28count%28kube_node_status_allocatable_memory_bytes%29+-+1%29+%2F+count%28kube_node_status_allocatable_memory_bytes%29\u0026g0.tab=1',
    labels: {
      alertname: 'KubeMemoryOvercommit',
      prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
      severity: 'warning',
    },
  },
  {
    annotations: {
      message:
        'This is an alert meant to ensure that the entire alerting pipeline is functional.\nThis alert is always firing, therefore it should always be firing in Alertmanager\nand always fire against a receiver. There are integrations with various notification\nmechanisms that send a notification when this alert is not firing. For example the\n"DeadMansSnitch" integration in PagerDuty.',
    },
    endsAt: new Date(new Date().getTime() + 1000 * 60 * 60 * 24).toISOString(),
    fingerprint: 'fc30b79dbdb0a043',
    receivers: [{ name: 'null' }],
    startsAt: '2021-04-06T12:53:25.520Z',
    status: { inhibitedBy: [], silencedBy: [], state: 'active' },
    updatedAt: '2021-04-08T16:23:25.522Z',
    generatorURL:
      'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\u0026g0.tab=1',
    labels: {
      alertname: 'Watchdog',
      prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
      severity: 'none',
    },
  },
];

const server = setupServer(
  rest.get(`${testService}/api/v2/alerts`, (req, res, ctx) => {
    return res(ctx.json(alerts));
  }),
);

describe('alerts', () => {
  jest.useFakeTimers();
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());

  it('should export a renderable AlertProvider', () => {
    //E
    const { queryByText } = render(
      <QueryClientProvider client={new QueryClient()}>
        <AlertProvider alertManagerUrl={testService}>test</AlertProvider>
      </QueryClientProvider>,
    );

    //V
    expect(queryByText('test')).toBeInTheDocument();
  });

  it('should retrieve expected alert', async () => {
    //S
    const queryClient = new QueryClient();

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <AlertProvider alertManagerUrl={testService}>{children}</AlertProvider>
      </QueryClientProvider>
    );

    //E
    const { result, waitForNextUpdate } = renderHook(() => useAlerts(), {
      wrapper,
    });

    await waitForNextUpdate();

    //V
    expect(result.current.alerts.map(alert => alert.originalAlert)).toStrictEqual(alerts);
  });

  afterAll(() => server.close());
});
