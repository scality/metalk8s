#!jinja | metalk8s_kubernetes

{%- raw %}
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  labels:
    app.kubernetes.io/part-of: metalk8s
    metalk8s.scality.com/monitor: ''
  name: metalk8s-workload-plane-remediation.rules
  namespace: metalk8s-monitoring
spec:
  groups:
  - name: workload-plane-remediation
    rules:
    - alert: NodeWorkloadPlaneRemediated
      annotations:
        summary: Node drained after Workload Plane isolation
        description: Node {{ $labels.node }} carries the
          node.scality.com/workload-plane-unreachable:NoExecute taint applied by node-warden;
          its non-tolerating workloads have been evicted and it no longer serves Service
          traffic. The taint is removed automatically once Workload Plane connectivity
          recovers.
      expr: kube_node_spec_taint{key="node.scality.com/workload-plane-unreachable"} == 1
      for: 1m
      labels:
        severity: warning
    - alert: WorkloadPlaneOutage
      annotations:
        summary: Workload Plane outage affecting the majority of nodes
        description: More than half of the nodes report WorkloadPlaneNetworkUnavailable=True.
          node-warden's guard suppresses remediation in this case (a cluster-wide Workload
          Plane failure rather than a single-node fault), so no node is tainted. Investigate
          the Workload Plane network fabric.
      expr: |-
        count(kube_node_status_condition{condition="WorkloadPlaneNetworkUnavailable",status="true"} == 1)
          /
        count(kube_node_status_condition{condition="WorkloadPlaneNetworkUnavailable",status="true"}) > 0.5
      for: 1m
      labels:
        severity: critical
{%- endraw %}
