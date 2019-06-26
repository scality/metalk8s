import { call, all, put } from 'redux-saga/effects';
import {
  SET_CLUSTER_STATUS,
  SET_APISERVER_STATUS,
  SET_KUBESCHEDULER_STATUS,
  SET_KUBECONTROLLER_MANAGER_STATUS,
  fetchClusterStatus
} from './monitoring';
import { queryPrometheus } from '../../services/prometheus/api';

it('should set cluster status as UP', () => {
  const gen = fetchClusterStatus();

  expect(gen.next().value.type).toEqual('SELECT');

  const result = [
    {
      data: {
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
      status: 200,
      statusText: 'OK'
    },
    {
      data: {
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
      status: 200,
      statusText: 'OK'
    },
    {
      data: {
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
      },
      status: 200,
      statusText: 'OK'
    }
  ];

  expect(gen.next({ url_prometheus: '/api' }).value).toEqual(
    all([
      call(queryPrometheus, '/api', 'sum(up{job="apiserver"})'),
      call(queryPrometheus, '/api', 'sum(up{job="kube-scheduler"})'),
      call(queryPrometheus, '/api', 'sum(up{job="kube-controller-manager"})')
    ])
  );

  expect(gen.next(result).value).toEqual(
    put({ type: SET_APISERVER_STATUS, payload: [1561562554.553, '1'] })
  );

  expect(gen.next(result).value).toEqual(
    put({ type: SET_KUBESCHEDULER_STATUS, payload: [1561562554.611, '1'] })
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: SET_KUBECONTROLLER_MANAGER_STATUS,
      payload: [1561562554.559, '1']
    })
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: SET_CLUSTER_STATUS,
      payload: true
    })
  );
});

it('should set cluster status as DOWN because there is no kube-controller-manager job', () => {
  const gen = fetchClusterStatus();

  expect(gen.next().value.type).toEqual('SELECT');

  const result = [
    {
      data: {
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
      status: 200,
      statusText: 'OK'
    },
    {
      data: {
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
      status: 200,
      statusText: 'OK'
    },
    {
      data: {
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
      },
      status: 200,
      statusText: 'OK'
    }
  ];

  expect(gen.next({ url_prometheus: '/api' }).value).toEqual(
    all([
      call(queryPrometheus, '/api', 'sum(up{job="apiserver"})'),
      call(queryPrometheus, '/api', 'sum(up{job="kube-scheduler"})'),
      call(queryPrometheus, '/api', 'sum(up{job="kube-controller-manager"})')
    ])
  );

  expect(gen.next(result).value).toEqual(
    put({ type: SET_APISERVER_STATUS, payload: [1561562554.553, '1'] })
  );

  expect(gen.next(result).value).toEqual(
    put({ type: SET_KUBESCHEDULER_STATUS, payload: [1561562554.611, '1'] })
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: SET_KUBECONTROLLER_MANAGER_STATUS,
      payload: [1561562554.559, '0']
    })
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: SET_CLUSTER_STATUS,
      payload: false
    })
  );
});

it('should set cluster status as DOWN because api-server value is []', () => {
  const gen = fetchClusterStatus();

  expect(gen.next().value.type).toEqual('SELECT');

  const result = [
    {
      data: {
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
      status: 200,
      statusText: 'OK'
    },
    {
      data: {
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
      status: 200,
      statusText: 'OK'
    },
    {
      data: {
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
      },
      status: 200,
      statusText: 'OK'
    }
  ];

  expect(gen.next({ url_prometheus: '/api' }).value).toEqual(
    all([
      call(queryPrometheus, '/api', 'sum(up{job="apiserver"})'),
      call(queryPrometheus, '/api', 'sum(up{job="kube-scheduler"})'),
      call(queryPrometheus, '/api', 'sum(up{job="kube-controller-manager"})')
    ])
  );

  expect(gen.next(result).value).toEqual(
    put({ type: SET_APISERVER_STATUS, payload: [] })
  );

  expect(gen.next(result).value).toEqual(
    put({ type: SET_KUBESCHEDULER_STATUS, payload: [1561562554.611, '1'] })
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: SET_KUBECONTROLLER_MANAGER_STATUS,
      payload: [1561562554.559, '1']
    })
  );

  expect(gen.next(result).value).toEqual(
    put({
      type: SET_CLUSTER_STATUS,
      payload: false
    })
  );
});
