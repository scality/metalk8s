import {
  removeWarningAlerts,
  isAlertSelected,
  filterAlerts,
  getHealthStatus,
  formatHistoryAlerts,
  getChildrenAlerts,
} from './alertUtils';
import { alerts } from './alertUtilsData';
it('should return the alert list fitered the warning alert', () => {
  // @ts-expect-error - FIXME when you are working on it
  const result = removeWarningAlerts(alerts);
  expect(result.some(({ id }) => id === '1')).toBe(true);
  expect(result.some(({ id }) => id === '3')).toBe(true);
  expect(result.some(({ id }) => id === '2')).toBe(false);
});
it('should filter out the expected alerts', () => {
  const alerts = [
    {
      id: '24fa98722d9d63df',
      summary: 'Utilization metrics service not available',
      description:
        'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
      startsAt: '2024-06-04T13:29:51.402Z',
      endsAt: '2024-06-04T15:11:21.402Z',
      severity: 'warning',
      documentationUrl: '',
      labels: {
        alertname:
          'data-ops-alerting-internal-cloudserver-QuotaMetricsNotAvailable',
        prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
        severity: 'warning',
        description:
          'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
        namespace: 'zenko',
        summary: 'Utilization metrics service not available',
        zenko_component: 'internal-cloudserver',
        zenko_instance: 'data',
        selectors: [],
      },
      originalAlert: {
        annotations: {
          description:
            'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
          namespace: 'zenko',
          summary: 'Utilization metrics service not available',
          zenko_component: 'internal-cloudserver',
          zenko_instance: 'data',
        },
        endsAt: '2024-06-04T15:11:21.402Z',
        fingerprint: '24fa98722d9d63df',
        receivers: [
          {
            name: 'metalk8s-alert-logger',
          },
        ],
        startsAt: '2024-06-04T13:29:51.402Z',
        status: {
          inhibitedBy: ['308933b2082d0054'],
          silencedBy: [],
          state: 'suppressed',
        },
        updatedAt: '2024-06-04T15:07:21.409Z',
        generatorURL:
          'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=avg%28avg_over_time%28s3_cloudserver_quota_utilization_service_available%7Bnamespace%3D%22zenko%22%2Cservice%3D%22data-internal-s3api-metrics%22%7D%5B1m%5D%29%29+%3C+0.5&g0.tab=1',
        labels: {
          alertname:
            'data-ops-alerting-internal-cloudserver-QuotaMetricsNotAvailable',
          prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
          severity: 'warning',
        },
      },
      status: 'suppressed',
    },
    {
      id: '308933b2082d0054',
      summary: 'Utilization metrics service not available',
      description:
        'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
      startsAt: '2024-06-04T13:38:51.402Z',
      endsAt: '2024-06-04T15:11:21.402Z',
      severity: 'critical',
      documentationUrl: '',
      labels: {
        alertname:
          'data-ops-alerting-internal-cloudserver-QuotaMetricsNotAvailable',
        prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
        severity: 'critical',
        description:
          'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
        namespace: 'zenko',
        summary: 'Utilization metrics service not available',
        zenko_component: 'internal-cloudserver',
        zenko_instance: 'data',
        selectors: [],
      },
      originalAlert: {
        annotations: {
          description:
            'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
          namespace: 'zenko',
          summary: 'Utilization metrics service not available',
          zenko_component: 'internal-cloudserver',
          zenko_instance: 'data',
        },
        endsAt: '2024-06-04T15:11:21.402Z',
        fingerprint: '308933b2082d0054',
        receivers: [
          {
            name: 'metalk8s-alert-logger',
          },
        ],
        startsAt: '2024-06-04T13:38:51.402Z',
        status: {
          inhibitedBy: [],
          silencedBy: [],
          state: 'active',
        },
        updatedAt: '2024-06-04T15:07:21.410Z',
        generatorURL:
          'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=avg%28avg_over_time%28s3_cloudserver_quota_utilization_service_available%7Bnamespace%3D%22zenko%22%2Cservice%3D%22data-internal-s3api-metrics%22%7D%5B1m%5D%29%29+%3C+0.5&g0.tab=1',
        labels: {
          alertname:
            'data-ops-alerting-internal-cloudserver-QuotaMetricsNotAvailable',
          prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
          severity: 'critical',
        },
      },
      status: 'active',
    },
    {
      id: '33ea695920909903',
      summary: 'This version support will end on 2024-06-07',
      description: 'This version support will end on 2024-06-07',
      startsAt: '2024-06-04T13:13:25.673Z',
      endsAt: '2024-06-04T15:11:25.673Z',
      severity: 'warning',
      documentationUrl: '',
      labels: {
        alertname: 'VersionSoonOutdated',
        prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
        severity: 'warning',
        description: 'This version support will end on 2024-06-07',
        summary: 'This version support will end on 2024-06-07',
        selectors: [],
      },
      originalAlert: {
        annotations: {
          description: 'This version support will end on 2024-06-07',
          summary: 'This version support will end on 2024-06-07',
        },
        endsAt: '2024-06-04T15:11:25.673Z',
        fingerprint: '33ea695920909903',
        receivers: [
          {
            name: 'metalk8s-alert-logger',
          },
        ],
        startsAt: '2024-06-04T13:13:25.673Z',
        status: {
          inhibitedBy: [],
          silencedBy: [],
          state: 'active',
        },
        updatedAt: '2024-06-04T15:07:25.676Z',
        generatorURL:
          'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%28time%28%29%29+%3E+1.7099424e%2B09+and+vector%28time%28%29%29+%3C%3D+1.7177184e%2B09&g0.tab=1',
        labels: {
          alertname: 'VersionSoonOutdated',
          prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
          severity: 'warning',
        },
      },
      status: 'active',
    },
    {
      id: '4c436f49b2d65b4e',
      summary: 'Utilization metrics service not available',
      description:
        'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
      startsAt: '2024-06-04T13:38:28.719Z',
      endsAt: '2024-06-04T15:12:28.719Z',
      severity: 'critical',
      documentationUrl: '',
      labels: {
        alertname:
          'data-ops-alerting-connector-cloudserver-QuotaMetricsNotAvailable',
        prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
        severity: 'critical',
        description:
          'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
        namespace: 'zenko',
        summary: 'Utilization metrics service not available',
        zenko_component: 'connector-cloudserver',
        zenko_instance: 'data',
        selectors: [],
      },
      originalAlert: {
        annotations: {
          description:
            'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
          namespace: 'zenko',
          summary: 'Utilization metrics service not available',
          zenko_component: 'connector-cloudserver',
          zenko_instance: 'data',
        },
        endsAt: '2024-06-04T15:12:28.719Z',
        fingerprint: '4c436f49b2d65b4e',
        receivers: [
          {
            name: 'metalk8s-alert-logger',
          },
        ],
        startsAt: '2024-06-04T13:38:28.719Z',
        status: {
          inhibitedBy: [],
          silencedBy: [],
          state: 'active',
        },
        updatedAt: '2024-06-04T15:08:28.734Z',
        generatorURL:
          'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=avg%28avg_over_time%28s3_cloudserver_quota_utilization_service_available%7Bnamespace%3D%22zenko%22%2Cservice%3D%22data-connector-s3api-metrics%22%7D%5B1m%5D%29%29+%3C+0.5&g0.tab=1',
        labels: {
          alertname:
            'data-ops-alerting-connector-cloudserver-QuotaMetricsNotAvailable',
          prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
          severity: 'critical',
        },
      },
      status: 'active',
    },
    {
      id: '7b62ddc7ed797e35',
      summary: 'Utilization metrics service not available',
      description:
        'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
      startsAt: '2024-06-04T13:29:28.719Z',
      endsAt: '2024-06-04T15:12:28.719Z',
      severity: 'warning',
      documentationUrl: '',
      labels: {
        alertname:
          'data-ops-alerting-connector-cloudserver-QuotaMetricsNotAvailable',
        prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
        severity: 'warning',
        description:
          'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
        namespace: 'zenko',
        summary: 'Utilization metrics service not available',
        zenko_component: 'connector-cloudserver',
        zenko_instance: 'data',
        selectors: [],
      },
      originalAlert: {
        annotations: {
          description:
            'The storage metrics required for Account or S3 Bucket Quota checks are not available, the quotas are disabled.',
          namespace: 'zenko',
          summary: 'Utilization metrics service not available',
          zenko_component: 'connector-cloudserver',
          zenko_instance: 'data',
        },
        endsAt: '2024-06-04T15:12:28.719Z',
        fingerprint: '7b62ddc7ed797e35',
        receivers: [
          {
            name: 'metalk8s-alert-logger',
          },
        ],
        startsAt: '2024-06-04T13:29:28.719Z',
        status: {
          inhibitedBy: ['4c436f49b2d65b4e'],
          silencedBy: [],
          state: 'suppressed',
        },
        updatedAt: '2024-06-04T15:08:28.732Z',
        generatorURL:
          'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=avg%28avg_over_time%28s3_cloudserver_quota_utilization_service_available%7Bnamespace%3D%22zenko%22%2Cservice%3D%22data-connector-s3api-metrics%22%7D%5B1m%5D%29%29+%3C+0.5&g0.tab=1',
        labels: {
          alertname:
            'data-ops-alerting-connector-cloudserver-QuotaMetricsNotAvailable',
          prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
          severity: 'warning',
        },
      },
      status: 'suppressed',
    },
    {
      id: 'f1eccc5cefca8be9',
      summary: '',
      description:
        'Your product instance is missing a valid license key.\nYou can request one from Scality by sending an email to\nsales_operations@scality.com providing your company name\nand instance ID.\n',
      startsAt: '2024-06-04T13:12:15.081Z',
      endsAt: '2024-06-04T15:12:09.081Z',
      severity: 'warning',
      documentationUrl: '',
      labels: {
        alertname: 'MissingLicense',
        container: 'license-metrics-exporter',
        endpoint: 'http',
        instance: '10.233.33.34:8080',
        job: 'license-metrics-exporter',
        namespace: 'license',
        pod: 'license-metrics-exporter-ff6598b5-5zzrz',
        prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
        service: 'license-metrics-exporter',
        severity: 'warning',
        description:
          'Your product instance is missing a valid license key.\nYou can request one from Scality by sending an email to\nsales_operations@scality.com providing your company name\nand instance ID.\n',
        selectors: [],
      },
      originalAlert: {
        annotations: {
          description:
            'Your product instance is missing a valid license key.\nYou can request one from Scality by sending an email to\nsales_operations@scality.com providing your company name\nand instance ID.\n',
        },
        endsAt: '2024-06-04T15:12:09.081Z',
        fingerprint: 'f1eccc5cefca8be9',
        receivers: [
          {
            name: 'metalk8s-alert-logger',
          },
        ],
        startsAt: '2024-06-04T13:12:15.081Z',
        status: {
          inhibitedBy: [],
          silencedBy: [],
          state: 'active',
        },
        updatedAt: '2024-06-04T15:08:09.084Z',
        generatorURL:
          'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=license_type+%3D%3D+1&g0.tab=1',
        labels: {
          alertname: 'MissingLicense',
          container: 'license-metrics-exporter',
          endpoint: 'http',
          instance: '10.233.33.34:8080',
          job: 'license-metrics-exporter',
          namespace: 'license',
          pod: 'license-metrics-exporter-ff6598b5-5zzrz',
          prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
          service: 'license-metrics-exporter',
          severity: 'warning',
        },
      },
      status: 'active',
    },
    {
      id: 'fc30b79dbdb0a043',
      summary:
        'An alert that should always be firing to certify that Alertmanager is working properly.',
      description:
        'This is an alert meant to ensure that the entire alerting pipeline is functional.\nThis alert is always firing, therefore it should always be firing in Alertmanager\nand always fire against a receiver. There are integrations with various notification\nmechanisms that send a notification when this alert is not firing. For example the\n"DeadMansSnitch" integration in PagerDuty.',
      startsAt: '2024-06-04T12:55:51.687Z',
      endsAt: '2024-06-04T15:11:51.687Z',
      severity: 'none',
      documentationUrl:
        'https://runbooks.prometheus-operator.dev/runbooks/general/watchdog',
      labels: {
        alertname: 'Watchdog',
        prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
        severity: 'none',
        description:
          'This is an alert meant to ensure that the entire alerting pipeline is functional.\nThis alert is always firing, therefore it should always be firing in Alertmanager\nand always fire against a receiver. There are integrations with various notification\nmechanisms that send a notification when this alert is not firing. For example the\n"DeadMansSnitch" integration in PagerDuty.',
        runbook_url:
          'https://runbooks.prometheus-operator.dev/runbooks/general/watchdog',
        summary:
          'An alert that should always be firing to certify that Alertmanager is working properly.',
        selectors: [],
      },
      originalAlert: {
        annotations: {
          description:
            'This is an alert meant to ensure that the entire alerting pipeline is functional.\nThis alert is always firing, therefore it should always be firing in Alertmanager\nand always fire against a receiver. There are integrations with various notification\nmechanisms that send a notification when this alert is not firing. For example the\n"DeadMansSnitch" integration in PagerDuty.',
          runbook_url:
            'https://runbooks.prometheus-operator.dev/runbooks/general/watchdog',
          summary:
            'An alert that should always be firing to certify that Alertmanager is working properly.',
        },
        endsAt: '2024-06-04T15:11:51.687Z',
        fingerprint: 'fc30b79dbdb0a043',
        receivers: [
          {
            name: 'metalk8s-alert-logger',
          },
          {
            name: 'null',
          },
        ],
        startsAt: '2024-06-04T12:55:51.687Z',
        status: {
          inhibitedBy: [],
          silencedBy: [],
          state: 'active',
        },
        updatedAt: '2024-06-04T15:07:51.693Z',
        generatorURL:
          'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29&g0.tab=1',
        labels: {
          alertname: 'Watchdog',
          prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
          severity: 'none',
        },
      },
      status: 'active',
    },
  ];
  //@ts-expect-error
  const result = removeWarningAlerts(alerts);
  expect(
    result.filter(
      (alert) =>
        alert.labels.alertname ===
        'data-ops-alerting-internal-cloudserver-QuotaMetricsNotAvailable',
    ),
  ).toHaveLength(1);
  expect(
    result.filter(
      (alert) =>
        alert.labels.alertname ===
        'data-ops-alerting-internal-cloudserver-QuotaMetricsNotAvailable',
    )[0].severity,
  ).toBe('critical');

  expect(
    result.filter(
      (alert) =>
        alert.labels.alertname ===
        'data-ops-alerting-connector-cloudserver-QuotaMetricsNotAvailable',
    ),
  ).toHaveLength(1);
  expect(
    result.filter(
      (alert) =>
        alert.labels.alertname ===
        'data-ops-alerting-connector-cloudserver-QuotaMetricsNotAvailable',
    )[0].severity,
  ).toBe('critical');
});
it('should return false when the labels has different value', () => {
  const labels = {
    node: 'node1',
    alertname: 'Madalyn',
  };
  const filters = {
    node: 'node1',
    alertname: 'Doretta',
  };
  const result = isAlertSelected(labels, filters);
  expect(result).toEqual(false);
});
it('should return false when filters has a different property', () => {
  const labels = {
    node: 'node1',
    alertname: 'Madalyn',
  };
  const filters = {
    node: 'node1',
    severity: 'critical',
  };
  const result = isAlertSelected(labels, filters);
  expect(result).toEqual(false);
});
it('should return true when selectors is the subset of labels', () => {
  const labels = {
    node: 'node1',
    alertname: 'Madalyn',
  };
  const filters = {
    node: 'node1',
  };
  const result = isAlertSelected(labels, filters);
  expect(result).toEqual(true);
});
it('should return true when filters has more possible values', () => {
  const labels = {
    node: 'node1',
    alertname: 'Madalyn',
  };
  const filters = {
    node: 'node1',
    alertname: ['Madalyn', 'Robin'],
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
  // @ts-expect-error - FIXME when you are working on it
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
      labels: {
        severity: 'warning',
      },
    },
  ];
  // @ts-expect-error - FIXME when you are working on it
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
      labels: {
        severity: 'warning',
      },
    },
    {
      summary: '',
      description: '',
      startsAt: '2020-01-18T16:43:35.358Z',
      endsAt: '2020-01-21T09:32:35.358Z',
      labels: {
        severity: 'critical',
      },
    },
  ];
  // @ts-expect-error - FIXME when you are working on it
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
      labels: {
        severity: 'warning',
      },
    },
    {
      summary: '',
      description: '',
      startsAt: '2021-01-18T16:43:35.358Z',
      endsAt: '2021-01-21T09:32:35.358Z',
      labels: {
        severity: 'critical',
      },
    },
  ];
  // @ts-expect-error - FIXME when you are working on it
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
      labels: {
        severity: 'none',
      },
    },
  ];
  // @ts-expect-error - FIXME when you are working on it
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
      labels: {
        severity: 'critical',
      },
    },
  ];
  // @ts-expect-error - FIXME when you are working on it
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
  // @ts-expect-error - FIXME when you are working on it
  const result = formatHistoryAlerts(streamValue);
  const historyAlert = [
    {
      id: 'cdd335e8d749c265',
      summary: '',
      description:
        'etcd cluster "kube-etcd": member communication with f38477b69f3c6f6b is taking 0.3727360000000002s on etcd instance 10.200.5.55:2381.',
      startsAt: '2021-03-10T11:29:45.279Z',
      endsAt: null,
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
//test getChildrenAlerts()
it('filters the alerts and only get MetalK8s alerts', () => {
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
  const childrenJsonPath = [
    "$[?((@.labels.alertname === 'NodeAtRisk' && @.labels.severity === 'critical') || (@.labels.alertname === 'PlatformServicesAtRisk' && @.labels.severity === 'critical') || (@.labels.alertname === 'VolumeAtRisk' && @.labels.severity === 'critical'))]",
  ];
  // @ts-expect-error - FIXME when you are working on it
  const metalK8sAlerts = getChildrenAlerts(childrenJsonPath, alerts);
  expect(metalK8sAlerts.length).toBe(1);
});
