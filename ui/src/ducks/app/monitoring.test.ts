import { call, all, put, delay } from 'redux-saga/effects';
import {
  UPDATE_CLUSTER_STATUS,
  SET_PROMETHEUS_API_AVAILABLE,
  UPDATE_ALERTS,
  handlePrometheusError,
  fetchAlerts,
  fetchClusterStatus,
  refreshAlerts,
  refreshClusterStatus,
} from './monitoring';
import { REFRESH_TIMEOUT } from '../../constants';
import { queryPrometheus } from '../../services/prometheus/api';
import * as CoreApi from '../../services/k8s/core';
it('should set cluster status as UP', () => {
  const gen = fetchClusterStatus();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        isLoading: true,
      },
    }),
  );
  const result = [
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.553, '1'],
          },
        ],
      },
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.611, '1'],
          },
        ],
      },
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.559, '1'],
          },
        ],
      },
    },
  ];
  expect(gen.next().value).toEqual(
    all([
      call(queryPrometheus, 'sum(up{job="apiserver"})'),
      call(queryPrometheus, 'sum(up{job="kube-scheduler"})'),
      call(queryPrometheus, 'sum(up{job="kube-controller-manager"})'),
    ]),
  );
  expect(gen.next(result).value).toEqual(
    put({
      type: SET_PROMETHEUS_API_AVAILABLE,
      payload: true,
    }),
  );
  expect(gen.next(result).value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 1,
        kubeControllerManagerStatus: 1,
        kubeSchedulerStatus: 1,
        error: null,
        isPrometheusVolumeProvisioned: true,
      },
    }),
  );
  expect(gen.next().value).toEqual(delay(1000));
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        isLoading: false,
      },
    }),
  );
});
it('should set cluster status as DOWN because there is no kube-controller-manager job', () => {
  const gen = fetchClusterStatus();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        isLoading: true,
      },
    }),
  );
  const result = [
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.553, '1'],
          },
        ],
      },
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.611, '1'],
          },
        ],
      },
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.559, '0'],
          },
        ],
      },
    },
  ];
  expect(gen.next().value).toEqual(
    all([
      call(queryPrometheus, 'sum(up{job="apiserver"})'),
      call(queryPrometheus, 'sum(up{job="kube-scheduler"})'),
      call(queryPrometheus, 'sum(up{job="kube-controller-manager"})'),
    ]),
  );
  expect(gen.next(result).value).toEqual(
    put({
      type: SET_PROMETHEUS_API_AVAILABLE,
      payload: true,
    }),
  );
  expect(gen.next(result).value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 1,
        kubeControllerManagerStatus: 0,
        kubeSchedulerStatus: 1,
        error: null,
        isPrometheusVolumeProvisioned: true,
      },
    }),
  );
  expect(gen.next().value).toEqual(delay(1000));
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        isLoading: false,
      },
    }),
  );
});
it('should set cluster status as DOWN because api-server value is []', () => {
  const gen = fetchClusterStatus();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        isLoading: true,
      },
    }),
  );
  const result = [
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [],
          },
        ],
      },
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.611, '1'],
          },
        ],
      },
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.559, '1'],
          },
        ],
      },
    },
  ];
  expect(gen.next().value).toEqual(
    all([
      call(queryPrometheus, 'sum(up{job="apiserver"})'),
      call(queryPrometheus, 'sum(up{job="kube-scheduler"})'),
      call(queryPrometheus, 'sum(up{job="kube-controller-manager"})'),
    ]),
  );
  expect(gen.next(result).value).toEqual(
    put({
      type: SET_PROMETHEUS_API_AVAILABLE,
      payload: true,
    }),
  );
  expect(gen.next(result).value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 0,
        kubeControllerManagerStatus: 1,
        kubeSchedulerStatus: 1,
        error: null,
        isPrometheusVolumeProvisioned: true,
      },
    }),
  );
  expect(gen.next().value).toEqual(delay(1000));
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        isLoading: false,
      },
    }),
  );
});
it('should set cluster error if a query failed', () => {
  const gen = fetchClusterStatus();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        isLoading: true,
      },
    }),
  );
  const result = [
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [],
          },
        ],
      },
    },
    {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [1561562554.611, '1'],
          },
        ],
      },
    },
    {
      error: {
        response: {
          statusText: 'Bad Request',
        },
      },
    },
  ];
  expect(gen.next().value).toEqual(
    all([
      call(queryPrometheus, 'sum(up{job="apiserver"})'),
      call(queryPrometheus, 'sum(up{job="kube-scheduler"})'),
      call(queryPrometheus, 'sum(up{job="kube-controller-manager"})'),
    ]),
  );
  expect(gen.next(result).value).toEqual(
    call(
      handlePrometheusError,
      {
        apiServerStatus: 0,
        error: null,
        kubeControllerManagerStatus: 0,
        kubeSchedulerStatus: 0,
        isPrometheusVolumeProvisioned: true,
      },
      {
        error: {
          response: {
            statusText: 'Bad Request',
          },
        },
      },
    ),
  );
  expect(gen.next(result).value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        apiServerStatus: 0,
        kubeControllerManagerStatus: 0,
        kubeSchedulerStatus: 0,
        error: null,
        isPrometheusVolumeProvisioned: true,
      },
    }),
  );
  expect(gen.next().value).toEqual(delay(1000));
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        isLoading: false,
      },
    }),
  );
});
it('should handlePrometheusError when prometheus is up', () => {
  const result = {
    error: {
      response: {
        statusText: 'Bad Request',
        status: 400,
      },
    },
  };
  const gen = handlePrometheusError({}, result);
  expect(gen.next().value).toEqual(
    put({
      type: SET_PROMETHEUS_API_AVAILABLE,
      payload: true,
    }),
  );
});
it('should handlePrometheusError when prometheus is down, the error is unknown since prometheus volume already provisioned', () => {
  const result = {
    error: {},
  };
  const gen = handlePrometheusError({}, result);
  expect(gen.next(result).value).toEqual(
    call(CoreApi.queryPodInNamespace, 'metalk8s-monitoring', 'prometheus'),
  );
  const prometheusPod = {
    body: {
      items: [
        {
          status: {
            conditions: [
              {
                message: 'volume already provisioned',
              },
            ],
          },
        },
      ],
      kind: 'PodList',
    },
    response: {},
  };
  expect(gen.next(prometheusPod).value).toEqual(
    put({
      type: SET_PROMETHEUS_API_AVAILABLE,
      payload: false,
    }),
  );
  expect(gen.next().done).toEqual(true);
});
it('should refresh Alerts if no error', () => {
  const gen = refreshAlerts();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_ALERTS,
      payload: {
        isRefreshing: true,
      },
    }),
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
      payload: {
        isRefreshing: true,
      },
    }),
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
      payload: {
        isRefreshing: true,
      },
    }),
  );
  expect(gen.next().value).toEqual(call(fetchAlerts));
  expect(
    gen.next({
      error: '404',
    }).done,
  ).toEqual(true);
});
it('should refresh ClusterStatus if no error', () => {
  const gen = refreshClusterStatus();
  expect(gen.next().value).toEqual(
    put({
      type: UPDATE_CLUSTER_STATUS,
      payload: {
        isRefreshing: true,
      },
    }),
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
      payload: {
        isRefreshing: true,
      },
    }),
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
      payload: {
        isRefreshing: true,
      },
    }),
  );
  expect(gen.next().value).toEqual(call(fetchClusterStatus));
  expect(
    gen.next({
      error: '404',
    }).done,
  ).toEqual(true);
});
it('should handlePrometheusError and set the Unknown status for cluster when there is no provision volume', () => {
  const result = {
    error: {},
  };
  const gen = handlePrometheusError({}, result);
  expect(gen.next(result).value).toEqual(
    call(CoreApi.queryPodInNamespace, 'metalk8s-monitoring', 'prometheus'),
  );
  const prometheusPod = {
    body: {
      items: [
        {
          status: {
            conditions: [
              {
                status: 'False',
                reason: 'Unschedulable',
                type: 'PodScheduled',
                message:
                  "0/1 nodes are available: 1 node(s) didn't find available persistent volumes to bind.",
              },
            ],
          },
        },
      ],
      kind: 'PodList',
    },
    response: {},
  };
  expect(gen.next(prometheusPod).value).toEqual(
    put({
      type: SET_PROMETHEUS_API_AVAILABLE,
      payload: false,
    }),
  );
  expect(gen.next().done).toEqual(true);
});