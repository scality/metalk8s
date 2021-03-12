import {
  removeWarningAlerts,
  isAlertSelected,
  filterAlerts,
  getHealthStatus,
  formatHistoryAlerts,
} from './alertUtils';
import { alerts } from './alertUtilsData';

it('should return the alert list fitered the warning alert', () => {
  const result = removeWarningAlerts(alerts);
  expect(result.some(({ id }) => id === '1')).toBe(true);
  expect(result.some(({ id }) => id === '3')).toBe(true);
  expect(result.some(({ id }) => id === '2')).toBe(false);
});

it('should return false when the labels has different value', () => {
  const labels = { node: 'node1', alertname: 'Madalyn' };
  const filters = { node: 'node1', alertname: 'Doretta' };
  const result = isAlertSelected(labels, filters);
  expect(result).toEqual(false);
});

it('should return false when filters has a different property', () => {
  const labels = { node: 'node1', alertname: 'Madalyn' };
  const filters = { node: 'node1', severity: 'critical' };
  const result = isAlertSelected(labels, filters);
  expect(result).toEqual(false);
});

it('should return false when the labels do not have the parents label', () => {
  const labels = {
    node: 'node1',
    alertname: 'Madalyn',
  };
  const filters = {
    node: 'node1',
    alertname: 'Madalyn',
    parents: ['John'],
  };
  const result = isAlertSelected(labels, filters);
  expect(result).toEqual(false);
});

it('should return true when selectors is the subset of labels', () => {
  const labels = { node: 'node1', alertname: 'Madalyn' };
  const filters = { node: 'node1' };
  const result = isAlertSelected(labels, filters);
  expect(result).toEqual(true);
});

it('should return true when filters has more possible values', () => {
  const labels = { node: 'node1', alertname: 'Madalyn' };
  const filters = {
    node: 'node1',
    alertname: ['Madalyn', 'Robin'],
  };
  const result = isAlertSelected(labels, filters);
  expect(result).toEqual(true);
});

it('should return true when filters has at least one parents label', () => {
  const labels = {
    node: 'node1',
    alertname: 'Madalyn',
    parents: ['John', 'Jack'],
  };
  const filters = {
    node: 'node1',
    alertname: 'Madalyn',
    parents: ['John'],
  };
  const result = isAlertSelected(labels, filters);
  expect(result).toEqual(true);
});

it('filters the alert base on the labels', async () => {
  const filters = {
    instance: '192.168.1.6:9100',
    severity: 'warning',
    device: '/dev/vdc2',
  };
  const result = await filterAlerts(alerts, filters);

  expect(result.some(({ id }) => id === '1')).toBe(false);
  expect(result.some(({ id }) => id === '3')).toBe(false);
  expect(result.some(({ id }) => id === '2')).toBe(true);
});

it('should return warning for during the time when warning alert was firing', () => {
  const alerts = [
    {
      summary: '',
      description: '',
      startsAt: '2021-01-18T16:43:35.358Z',
      endsAt: '2021-01-21T09:32:35.358Z',
      labels: { severity: 'warning' },
    },
  ];
  const result = getHealthStatus(alerts, '2021-01-18T20:43:35.358Z');
  expect(result).toEqual('warning');
});

it('should return warning status during the time when warning alert was firing but no critical alert', () => {
  const alerts = [
    {
      summary: '',
      description: '',
      startsAt: '2021-01-18T16:43:35.358Z',
      endsAt: '2021-01-21T09:32:35.358Z',
      labels: { severity: 'warning' },
    },
    {
      summary: '',
      description: '',
      startsAt: '2020-01-18T16:43:35.358Z',
      endsAt: '2020-01-21T09:32:35.358Z',
      labels: { severity: 'critical' },
    },
  ];
  const result = getHealthStatus(alerts, '2021-01-18T20:43:35.358Z');
  expect(result).toEqual('warning');
});

it('should return critical status during the time when critical alert and warning alert are both firing', () => {
  const alerts = [
    {
      summary: '',
      description: '',
      startsAt: '2021-01-18T16:43:35.358Z',
      endsAt: '2021-01-21T09:32:35.358Z',
      labels: { severity: 'warning' },
    },
    {
      summary: '',
      description: '',
      startsAt: '2021-01-18T16:43:35.358Z',
      endsAt: '2021-01-21T09:32:35.358Z',
      labels: { severity: 'critical' },
    },
  ];
  const result = getHealthStatus(alerts, '2021-01-18T20:43:35.358Z');
  expect(result).toEqual('critical');
});

it('should return healthy when only watchdog alert fired', () => {
  const alerts = [
    {
      summary: '',
      description: '',
      startsAt: '2021-01-18T16:43:35.358Z',
      endsAt: '2021-01-21T09:32:35.358Z',
      labels: { severity: 'none' },
    },
  ];
  const result = getHealthStatus(alerts, '2021-01-18T20:43:35.358Z');
  expect(result).toEqual('none');
});

it('should return healthy for current status when all the alerts were on the past', () => {
  const alerts = [
    {
      summary: '',
      description: '',
      startsAt: '2021-01-18T16:43:35.358Z',
      endsAt: '2021-01-21T09:32:35.358Z',
      labels: { severity: 'critical' },
    },
  ];
  const result = getHealthStatus(alerts, new Date().toISOString());
  expect(result).toEqual('healthy');
});

it('should format the history alert', () => {
  // mock a constructor new Date() using jest.spyOn
  const mockDate = new Date(0);
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

  const streamValue = [
    {
      stream: {
        node: 'master-1',
        pod: 'alert-logger-869df55f4-rjw4v',
        stream: 'stderr',
        app: 'alert-logger',
        container: 'alert-logger',
        job: 'fluent-bit',
        namespace: 'metalk8s-monitoring',
      },
      values: [
        [
          '1615386075739778950',
          '{"status":"firing","labels":{"To":"f38477b69f3c6f6b","alertname":"etcdMemberCommunicationSlow","endpoint":"http-metrics","instance":"10.200.5.55:2381","job":"kube-etcd","namespace":"kube-system","pod":"etcd-master-0","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-etcd","severity":"warning"},"annotations":{"message":"etcd cluster \\"kube-etcd\\": member communication with f38477b69f3c6f6b is taking 0.3727360000000002s on etcd instance 10.200.5.55:2381."},"startsAt":"2021-03-10T11:29:45.279Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=histogram_quantile%280.99%2C+rate%28etcd_network_peer_round_trip_time_seconds_bucket%7Bjob%3D~%22.%2Aetcd.%2A%22%7D%5B5m%5D%29%29+%3E+0.15\\u0026g0.tab=1","fingerprint":"cdd335e8d749c265"}',
        ],
      ],
    },
  ];

  const result = formatHistoryAlerts(streamValue);
  const historyAlert = [
    {
      id: 'cdd335e8d749c265',
      summary: '',
      description:
        'etcd cluster "kube-etcd": member communication with f38477b69f3c6f6b is taking 0.3727360000000002s on etcd instance 10.200.5.55:2381.',
      startsAt: '2021-03-10T11:29:45.279Z',
      endsAt: new Date().toISOString(),
      severity: 'warning',
      documentationUrl: '',
      labels: {
        To: 'f38477b69f3c6f6b',
        alertname: 'etcdMemberCommunicationSlow',
        endpoint: 'http-metrics',
        instance: '10.200.5.55:2381',
        job: 'kube-etcd',
        namespace: 'kube-system',
        pod: 'etcd-master-0',
        prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
        service: 'prometheus-operator-kube-etcd',
        severity: 'warning',
        parents: [],
        selectors: [],
      },
      originalAlert: {
        status: 'firing',
        labels: {
          To: 'f38477b69f3c6f6b',
          alertname: 'etcdMemberCommunicationSlow',
          endpoint: 'http-metrics',
          instance: '10.200.5.55:2381',
          job: 'kube-etcd',
          namespace: 'kube-system',
          pod: 'etcd-master-0',
          prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
          service: 'prometheus-operator-kube-etcd',
          severity: 'warning',
        },
        annotations: {
          message:
            'etcd cluster "kube-etcd": member communication with f38477b69f3c6f6b is taking 0.3727360000000002s on etcd instance 10.200.5.55:2381.',
        },
        startsAt: '2021-03-10T11:29:45.279Z',
        endsAt: '0001-01-01T00:00:00Z',
        generatorURL:
          'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=histogram_quantile%280.99%2C+rate%28etcd_network_peer_round_trip_time_seconds_bucket%7Bjob%3D~%22.%2Aetcd.%2A%22%7D%5B5m%5D%29%29+%3E+0.15&g0.tab=1',
        fingerprint: 'cdd335e8d749c265',
      },
    },
  ];
  expect(result).toEqual(historyAlert);
});
