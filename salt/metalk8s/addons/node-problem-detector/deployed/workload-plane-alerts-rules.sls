#!jinja | metalk8s_kubernetes

{%- raw %}
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  labels:
    app.kubernetes.io/part-of: metalk8s
    metalk8s.scality.com/monitor: ''
  name: metalk8s-workload-plane-detection.rules
  namespace: metalk8s-monitoring
spec:
  groups:
  - name: workload-plane-detection
    rules:
    - alert: NodeWorkloadPlaneUnavailable
      annotations:
        summary: Node has lost Workload Plane connectivity
        description: Node {{ $labels.node }} reports WorkloadPlaneNetworkUnavailable=True,
          it cannot reach the majority of its peers over the Workload Plane network.
          If the condition persists, node-warden taints the node NoExecute to drain
          its workloads. Check the Workload Plane network on this node.
      expr: kube_node_status_condition{condition="WorkloadPlaneNetworkUnavailable",status="true"} == 1
      for: 2m
      labels:
        severity: warning
{%- endraw %}
