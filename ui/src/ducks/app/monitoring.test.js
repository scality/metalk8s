import { call, all, put, delay } from 'redux-saga/effects';
import {
  UPDATE_CLUSTER_STATUS,
  SET_PROMETHEUS_API_AVAILABLE,
  UPDATE_ALERTS,
  handleClusterError,
  fetchAlerts,
  fetchClusterStatus,
  refreshAlerts,
  refreshClusterStatus
} from './monitoring';
import { REFRESH_TIMEOUT } from '../../constants';
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
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: { isLoading: true }
    })
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
      type: SET_PROMETHEUS_API_AVAILABLE,
      payload: true
    })
  );
  expect(gen.next(result).value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 1,
        kubeControllerManagerStatus: 1,
        kubeSchedulerStatus: 1,
        error: null
      }
    })
  );
  expect(gen.next().value).toEqual(delay(1000));
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: { isLoading: false }
    })
  );
});

it('should set cluster status as DOWN because there is no kube-controller-manager job', () => {
  const gen = fetchClusterStatus();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: { isLoading: true }
    })
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
      type: SET_PROMETHEUS_API_AVAILABLE,
      payload: true
    })
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 1,
        kubeControllerManagerStatus: 0,
        kubeSchedulerStatus: 1,
        error: null
      }
    })
  );
  expect(gen.next().value).toEqual(delay(1000));
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: { isLoading: false }
    })
  );
});

it('should set cluster status as DOWN because api-server value is []', () => {
  const gen = fetchClusterStatus();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: { isLoading: true }
    })
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
      type: SET_PROMETHEUS_API_AVAILABLE,
      payload: true
    })
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 0,
        kubeControllerManagerStatus: 1,
        kubeSchedulerStatus: 1,
        error: null
      }
    })
  );
  expect(gen.next().value).toEqual(delay(1000));
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: { isLoading: false }
    })
  );
});

it('should set cluster error if a query failed', () => {
  const gen = fetchClusterStatus();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: { isLoading: true }
    })
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
    call(
      handleClusterError,
      {
        apiServerStatus: 0,
        error: null,
        kubeControllerManagerStatus: 0,
        kubeSchedulerStatus: 0
      },
      { error: { response: { statusText: 'Bad Request' } } }
    )
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 0,
        kubeControllerManagerStatus: 0,
        kubeSchedulerStatus: 0,
        error: null
      }
    })
  );
  expect(gen.next().value).toEqual(delay(1000));
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: { isLoading: false }
    })
  );
});

it('should handleClusterError when prometheus is up', () => {
  const result = { error: { response: { statusText: 'Bad Request' } } };
  const gen = handleClusterError({}, result);
  expect(gen.next().value).toEqual(
    put({
      type: SET_PROMETHEUS_API_AVAILABLE,
      payload: true
    })
  );
});

it('should handleClusterError when prometheus is down', () => {
  const result = { error: {} };
  const gen = handleClusterError({}, result);
  expect(gen.next().value).toEqual(
    put({
      type: SET_PROMETHEUS_API_AVAILABLE,
      payload: false
    })
  );
});

it('should refresh Alerts if no error', () => {
  const gen = refreshAlerts();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_ALERTS,
      payload: { isRefreshing: true }
    })
  );
  expect(gen.next().value).toEqual(call(fetchAlerts));
  expect(gen.next({}).value).toEqual(delay(REFRESH_TIMEOUT));
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next(true).value).toEqual(call(refreshAlerts));
});

it('should stop refresh Alerts', () => {
  const gen = refreshAlerts();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_ALERTS,
      payload: { isRefreshing: true }
    })
  );
  expect(gen.next().value).toEqual(call(fetchAlerts));
  expect(gen.next({}).value).toEqual(delay(REFRESH_TIMEOUT));
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next(false).done).toEqual(true);
});

it('should not refresh Alerts if error', () => {
  const gen = refreshAlerts();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_ALERTS,
      payload: { isRefreshing: true }
    })
  );
  expect(gen.next().value).toEqual(call(fetchAlerts));
  expect(gen.next({ error: '404' }).done).toEqual(true);
});

it('should refresh ClusterStatus if no error', () => {
  const gen = refreshClusterStatus();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: { isRefreshing: true }
    })
  );
  expect(gen.next().value).toEqual(call(fetchClusterStatus));
  expect(gen.next().value).toEqual(delay(REFRESH_TIMEOUT));
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next(true).value).toEqual(call(refreshClusterStatus));
});

it('should stop refresh ClusterStatus', () => {
  const gen = refreshClusterStatus();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: { isRefreshing: true }
    })
  );
  expect(gen.next().value).toEqual(call(fetchClusterStatus));
  expect(gen.next().value).toEqual(delay(REFRESH_TIMEOUT));
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next(false).done).toEqual(true);
});

it('should not refresh ClusterStatus if error', () => {
  const gen = refreshClusterStatus();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: { isRefreshing: true }
    })
  );
  expect(gen.next().value).toEqual(call(fetchClusterStatus));
  expect(gen.next({ error: '404' }).done).toEqual(true);
});
