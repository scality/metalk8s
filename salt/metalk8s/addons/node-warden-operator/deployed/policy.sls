#!jinja | metalk8s_kubernetes

apiVersion: warden.scality.com/v1alpha1
kind: NodeRemediationPolicy
metadata:
  name: workload-plane-isolation
spec:
  condition:
    type: PodNetworkUnavailable
    status: "True"
  remediations:
    taint:
      key: node.scality.com/workload-plane-unreachable
      effect: NoExecute
  debounce:
    enter: 60s
    exit: 30s
  guard:
    maxAffectedPercent: 50
