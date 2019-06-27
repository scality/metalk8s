import { call, all, put } from 'redux-saga/effects';
import {
  SET_CLUSTER_STATUS,
  SET_ALERTS,
  fetchClusterStatus
} from './monitoring';
import { queryPrometheus, getAlerts } from '../../services/prometheus/api';

const alertsResult = {
  data: {
    alerts: [
      {
        labels: {
          alertname: 'KubeNodeNotReady',
          condition: 'Ready',
          endpoint: 'https-main',
          instance: '10.233.132.80:8443',
          job: 'kube-state-metrics',
          namespace: 'monitoring',
          node: 'node1',
          pod: 'kube-state-metrics-6f76945b5b-g9mtf',
          service: 'kube-state-metrics',
          severity: 'warning',
          status: 'true'
        },
        annotations: {
          message: 'node1 has been unready for more than an hour.',
          runbook_url:
            'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubenodenotready'
        },
        state: 'firing',
        activeAt: '2019-06-27T06:10:17.588420806Z',
        value: 0
      }
    ]
  }
};

it('should set cluster status as UP', () => {
  const gen = fetchClusterStatus();

  expect(gen.next(alertsResult).value).toEqual(call(getAlerts));
  expect(gen.next(alertsResult).value).toEqual(
    put({ type: SET_ALERTS, payload: alertsResult.data.alerts })
  );

  const result = [
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.553, '1']
          }
        ]
      }
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.611, '1']
          }
        ]
      }
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.559, '1']
          }
        ]
      }
    }
  ];

  expect(gen.next().value).toEqual(
    all([
      call(queryPrometheus, 'sum(up{job="apiserver"})'),
      call(queryPrometheus, 'sum(up{job="kube-scheduler"})'),
      call(queryPrometheus, 'sum(up{job="kube-controller-manager"})')
    ])
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: SET_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 1,
        kubeControllerManagerStatus: 1,
        kubeSchedulerStatus: 1,
        status: 'CLUSTER_STATUS_UP',
        statusLabel: 'cluster_up_and_running'
      }
    })
  );
});

it('should set cluster status as DOWN because there is no kube-controller-manager job', () => {
  const gen = fetchClusterStatus();

  expect(gen.next(alertsResult).value).toEqual(call(getAlerts));
  expect(gen.next(alertsResult).value).toEqual(
    put({ type: SET_ALERTS, payload: alertsResult.data.alerts })
  );
  const result = [
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.553, '1']
          }
        ]
      }
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.611, '1']
          }
        ]
      }
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.559, '0']
          }
        ]
      }
    }
  ];

  expect(gen.next().value).toEqual(
    all([
      call(queryPrometheus, 'sum(up{job="apiserver"})'),
      call(queryPrometheus, 'sum(up{job="kube-scheduler"})'),
      call(queryPrometheus, 'sum(up{job="kube-controller-manager"})')
    ])
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: SET_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 1,
        kubeControllerManagerStatus: 0,
        kubeSchedulerStatus: 1,
        status: 'CLUSTER_STATUS_DOWN',
        statusLabel: 'down'
      }
    })
  );
});

it('should set cluster status as DOWN because api-server value is []', () => {
  const gen = fetchClusterStatus();

  expect(gen.next(alertsResult).value).toEqual(call(getAlerts));
  expect(gen.next(alertsResult).value).toEqual(
    put({ type: SET_ALERTS, payload: alertsResult.data.alerts })
  );

  const result = [
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: []
          }
        ]
      }
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.611, '1']
          }
        ]
      }
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.559, '1']
          }
        ]
      }
    }
  ];

  expect(gen.next().value).toEqual(
    all([
      call(queryPrometheus, 'sum(up{job="apiserver"})'),
      call(queryPrometheus, 'sum(up{job="kube-scheduler"})'),
      call(queryPrometheus, 'sum(up{job="kube-controller-manager"})')
    ])
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: SET_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 0,
        kubeControllerManagerStatus: 1,
        kubeSchedulerStatus: 1,
        status: 'CLUSTER_STATUS_DOWN',
        statusLabel: 'down'
      }
    })
  );
});

it('should set cluster error if a query failed', () => {
  const gen = fetchClusterStatus();

  expect(gen.next(alertsResult).value).toEqual(call(getAlerts));
  expect(gen.next(alertsResult).value).toEqual(
    put({ type: SET_ALERTS, payload: alertsResult.data.alerts })
  );

  const result = [
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: []
          }
        ]
      }
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.611, '1']
          }
        ]
      }
    },
    {
      error: {
        response: {
          statusText: 'Bad Request'
        }
      }
    }
  ];

  expect(gen.next().value).toEqual(
    all([
      call(queryPrometheus, 'sum(up{job="apiserver"})'),
      call(queryPrometheus, 'sum(up{job="kube-scheduler"})'),
      call(queryPrometheus, 'sum(up{job="kube-controller-manager"})')
    ])
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: SET_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 0,
        kubeControllerManagerStatus: 0,
        kubeSchedulerStatus: 0,
        status: 'CLUSTER_STATUS_ERROR',
        statusLabel: 'Prometheus - Bad Request'
      }
    })
  );
});
