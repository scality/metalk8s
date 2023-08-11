import { render } from './__TEST__/util';
import { useAlerts } from '../containers/AlertProvider';
import AlertNavbarUpdaterComponent, {
  AlertNavbarUpdaterComponentInteral,
} from './AlertNavbarUpdaterComponent';

describe('AlertNavbarUpdaterComponent', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const setupTest = () => {
    const publishNotification = jest.fn();
    const unPublishNotification = jest.fn();
    render(
      <AlertNavbarUpdaterComponentInteral
        publishNotification={publishNotification}
        unPublishNotification={unPublishNotification}
      />,
    );
    return { publishNotification, unPublishNotification };
  };
  const WATCHDOG_ALERT = {
    id: 'fc30b79dbdb0a043',
    summary:
      'An alert that should always be firing to certify that Alertmanager is working properly.',
    description:
      'This is an alert meant to ensure that the entire alerting pipeline is functional.\nThis alert is always firing, therefore it should always be firing in Alertmanager\nand always fire against a receiver. There are integrations with various notification\nmechanisms that send a notification when this alert is not firing. For example the\n"DeadMansSnitch" integration in PagerDuty.',
    startsAt: '2023-08-11T06:02:15.628Z',
    endsAt: '2023-08-11T09:24:15.628Z',
    severity: 'none',
    labels: {
      alertname: 'Watchdog',
    },
    originalAlert: {},
  };
  it('should publish a critical notification if there is a minimum of one critical alert', async () => {
    //S
    // @ts-ignore mock implementation
    useAlerts.mockImplementation(() => ({
      alerts: [
        WATCHDOG_ALERT,
        {
          id: 'cc7ee1e6c8c89eed',
          summary: 'This version support ended on 2023-07-13',
          description: 'This version support ended on 2023-07-13',
          startsAt: '2023-08-11T06:03:19.730Z',
          endsAt: '2023-08-11T09:23:49.730Z',
          severity: 'critical',
          documentationUrl: '',
          labels: {
            alertname: 'VersionOutdated',
            prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
            severity: 'critical',
            description: 'This version support ended on 2023-07-13',
            summary: 'This version support ended on 2023-07-13',
            selectors: [],
          },
          originalAlert: {},
        },
      ],
    }));
    const { publishNotification, unPublishNotification } = setupTest();
    //V
    expect(unPublishNotification).toHaveBeenCalledTimes(1);
    expect(unPublishNotification).toBeCalledWith('CriticalNotification');
    expect(publishNotification).toBeCalledWith({
      id: 'CriticalNotification',
      title: 'Alerts',
      description: 'There are 1 critical alert generated on the platform.',
      severity: 'critical',
      createdOn: new Date('2023-08-11T06:03:19.730Z'),
      redirectUrl: '/platform/alerts',
    });
    expect(publishNotification).toHaveBeenCalledTimes(1);
  });
  it('should publish a warning notification if there is a minimum of one warning alert', async () => {
    //S
    // @ts-ignore mock implementation
    useAlerts.mockImplementation(() => ({
      alerts: [
        WATCHDOG_ALERT,
        {
          id: '6513e9c0d1bae599',
          summary: 'count-items cronjob takes too long to finish',
          description:
            'Job artesca-data-ops-count-items is taking more than 3600s to complete.\nThis means that consumption information will be delayed\nand the reported metrics might not be accurate anymore.\n',
          startsAt: '2023-08-11T06:03:51.065Z',
          endsAt: '2023-08-11T14:13:51.065Z',
          severity: 'warning',
          documentationUrl: '',
          labels: {
            alertname:
              'artesca-data-ops-alerting-s3utils-CountItemsJobTakingTooLong',
            job_name: 'artesca-data-ops-count-items-manual-19-06-2023-1',
            prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
            severity: 'warning',
            description:
              'Job artesca-data-ops-count-items is taking more than 3600s to complete.\nThis means that consumption information will be delayed\nand the reported metrics might not be accurate anymore.\n',
            namespace: 'zenko',
            summary: 'count-items cronjob takes too long to finish',
            zenko_component: 's3utils',
            zenko_instance: 'artesca-data',
            selectors: [],
          },
          originalAlert: {
            annotations: {
              description:
                'Job artesca-data-ops-count-items is taking more than 3600s to complete.\nThis means that consumption information will be delayed\nand the reported metrics might not be accurate anymore.\n',
              namespace: 'zenko',
              summary: 'count-items cronjob takes too long to finish',
              zenko_component: 's3utils',
              zenko_instance: 'artesca-data',
            },
            endsAt: '2023-08-11T14:13:51.065Z',
            fingerprint: '6513e9c0d1bae599',
            receivers: [
              {
                name: 'metalk8s-alert-logger',
              },
            ],
            startsAt: '2023-08-11T06:03:51.065Z',
            status: {
              inhibitedBy: [],
              silencedBy: [],
              state: 'active',
            },
            updatedAt: '2023-08-11T14:09:51.074Z',
            generatorURL:
              'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=time%28%29+-+%28sum+by+%28job_name%29+%28kube_job_status_failed%7Bjob_name%3D~%22artesca-data-ops-count-items.%2A%22%7D%29+%3E+sum+by+%28job_name%29+%28kube_job_status_completion_time%7Bjob_name%3D~%22artesca-data-ops-count-items.%2A%22%7D%29+or+sum+by+%28job_name%29+%28kube_job_status_completion_time%7Bjob_name%3D~%22artesca-data-ops-count-items.%2A%22%7D%29%29+%3E+3600&g0.tab=1',
            labels: {
              alertname:
                'artesca-data-ops-alerting-s3utils-CountItemsJobTakingTooLong',
              job_name: 'artesca-data-ops-count-items-manual-19-06-2023-1',
              prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
              severity: 'warning',
            },
          },
        },
      ],
    }));
    const { publishNotification, unPublishNotification } = setupTest();
    //V
    expect(unPublishNotification).toHaveBeenCalledTimes(1);
    expect(unPublishNotification).toBeCalledWith('WarningNotification');
    expect(publishNotification).toBeCalledWith({
      id: 'WarningNotification',
      title: 'Alerts',
      description: 'There are 1 warning alert generated on the platform.',
      severity: 'warning',
      createdOn: new Date('2023-08-11T06:03:51.065Z'),
      redirectUrl: '/platform/alerts',
    });
    expect(publishNotification).toHaveBeenCalledTimes(1);
  });
  it('should publish a critical Alert System Notification and clear all the existing Alerts Notification if watchdog does not present', async () => {
    //S
    // @ts-ignore mock implementation
    useAlerts.mockImplementation(() => ({
      alerts: [],
    }));
    const now = new Date();
    jest.useFakeTimers();
    jest.setSystemTime(now);
    const { publishNotification, unPublishNotification } = setupTest();
    //V
    expect(unPublishNotification).toHaveBeenCalledTimes(2);
    expect(unPublishNotification).toBeCalledWith('CriticalNotification');
    expect(unPublishNotification).toBeCalledWith('WarningNotification');
    expect(publishNotification).toHaveBeenCalledTimes(1);
    expect(publishNotification).toBeCalledWith({
      id: 'Watchdog',
      title: 'Alerts',
      description: 'Alert System Unavailable',
      severity: 'critical',
      createdOn: now,
      redirectUrl: '/platform/alerts',
    });
  });
  it('should unpublish all the existing notification if there are no alerts except for the watchdog', async () => {
    //S
    // @ts-ignore mock implementation
    useAlerts.mockImplementation(() => ({
      alerts: [WATCHDOG_ALERT],
    }));
    const { publishNotification, unPublishNotification } = setupTest();
    //V
    expect(unPublishNotification).toHaveBeenCalledTimes(3);
    expect(unPublishNotification).toBeCalledWith('CriticalNotification');
    expect(unPublishNotification).toBeCalledWith('WarningNotification');
    expect(unPublishNotification).toBeCalledWith('Watchdog');
    expect(publishNotification).toHaveBeenCalledTimes(0);
  });
});
