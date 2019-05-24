import { put, takeEvery } from 'redux-saga/effects';

const FETCH_ALERTS = 'FETCH_ALERTS';
const SET_ALERTS = 'SET_ALERTS';

const defaultState = {
  list: []
};

export default function(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_ALERTS:
      return { ...state, list: action.payload };
    default:
      return state;
  }
}

export const fetchAlertsAction = () => {
  return { type: FETCH_ALERTS };
};

export const setAlertsAction = payload => {
  return { type: SET_ALERTS, payload };
};

export function* fetchAlerts() {
  const alerts = {
    status: 'success',
    data: {
      alerts: [
        {
          labels: {
            alertname: 'KubeControllerManagerDown',
            severity: 'critical'
          },
          annotations: {
            message:
              'KubeControllerManager has disappeared from Prometheus target discovery.',
            runbook_url:
              'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubecontrollermanagerdown'
          },
          state: 'firing',
          activeAt: '2019-05-16T13:19:47.64901609Z',
          value: 1
        },
        {
          labels: {
            alertname: 'KubeSchedulerDown',
            severity: 'critical'
          },
          annotations: {
            message:
              'KubeScheduler has disappeared from Prometheus target discovery.',
            runbook_url:
              'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeschedulerdown'
          },
          state: 'firing',
          activeAt: '2019-05-16T13:19:47.64901609Z',
          value: 1
        },
        {
          labels: {
            alertname: 'DeadMansSwitch',
            severity: 'none'
          },
          annotations: {
            message:
              'This is a DeadMansSwitch meant to ensure that the entire alerting pipeline is functional.'
          },
          state: 'firing',
          activeAt: '2019-05-16T13:19:45.022073385Z',
          value: 1
        },
        {
          labels: {
            alertname: 'KubeCPUOvercommit',
            severity: 'warning'
          },
          annotations: {
            message:
              'Cluster has overcommitted CPU resource requests for Pods and cannot tolerate node failure.',
            runbook_url:
              'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubecpuovercommit'
          },
          state: 'firing',
          activeAt: '2019-05-16T13:20:47.55260138Z',
          value: 1.0354999999999999
        },
        {
          labels: {
            alertname: 'KubeMemOvercommit',
            severity: 'warning'
          },
          annotations: {
            message:
              'Cluster has overcommitted memory resource requests for Pods and cannot tolerate node failure.',
            runbook_url:
              'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubememovercommit'
          },
          state: 'firing',
          activeAt: '2019-05-16T13:20:47.55260138Z',
          value: 1.4820173546394864
        },
        {
          labels: {
            alertname: 'CPUThrottlingHigh',
            container_name: 'node-exporter',
            namespace: 'monitoring',
            pod_name: 'node-exporter-m6g9k',
            severity: 'warning'
          },
          annotations: {
            message:
              '33% throttling of CPU in namespace monitoring for node-exporter.',
            runbook_url:
              'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-cputhrottlinghigh'
          },
          state: 'firing',
          activeAt: '2019-05-16T13:22:47.55260138Z',
          value: 33.333333333333336
        },
        {
          labels: {
            alertname: 'CPUThrottlingHigh',
            container_name: 'addon-resizer',
            namespace: 'monitoring',
            pod_name: 'kube-state-metrics-6dfc9b9844-hnbgv',
            severity: 'warning'
          },
          annotations: {
            message:
              '80% throttling of CPU in namespace monitoring for addon-resizer.',
            runbook_url:
              'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-cputhrottlinghigh'
          },
          state: 'firing',
          activeAt: '2019-05-16T13:22:47.55260138Z',
          value: 79.59183673469387
        },
        {
          labels: {
            alertname: 'KubePodNotReady',
            namespace: 'monitoring',
            pod: 'prometheus-k8s-1',
            severity: 'critical'
          },
          annotations: {
            message:
              'Pod monitoring/prometheus-k8s-1 has been in a non-ready state for longer than an hour.',
            runbook_url:
              'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubepodnotready'
          },
          state: 'pending',
          activeAt: '2019-05-16T13:20:05.095800493Z',
          value: 1
        },
        {
          labels: {
            alertname: 'KubePodNotReady',
            namespace: 'monitoring',
            pod: 'kube-state-metrics-66dc9c7946-vhcsb',
            severity: 'critical'
          },
          annotations: {
            message:
              'Pod monitoring/kube-state-metrics-66dc9c7946-vhcsb has been in a non-ready state for longer than an hour.',
            runbook_url:
              'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubepodnotready'
          },
          state: 'pending',
          activeAt: '2019-05-16T13:20:05.095800493Z',
          value: 1
        },
        {
          labels: {
            alertname: 'KubeStatefulSetReplicasMismatch',
            endpoint: 'https-main',
            instance: '10.233.166.131:8443',
            job: 'kube-state-metrics',
            namespace: 'monitoring',
            pod: 'kube-state-metrics-6dfc9b9844-hnbgv',
            service: 'kube-state-metrics',
            severity: 'critical',
            statefulset: 'prometheus-k8s'
          },
          annotations: {
            message:
              'StatefulSet monitoring/prometheus-k8s has not matched the expected number of replicas for longer than 15 minutes.',
            runbook_url:
              'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubestatefulsetreplicasmismatch'
          },
          state: 'firing',
          activeAt: '2019-05-16T13:20:05.095800493Z',
          value: 1
        }
      ]
    }
  };

  yield put(setAlertsAction(alerts.data.alerts));
}

export function* alertsSaga() {
  yield takeEvery(FETCH_ALERTS, fetchAlerts);
}
