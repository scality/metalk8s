Define the full hierarchy of logical alerts for MetalK8s and the systems underneath:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/prometheus_rule.yaml
    - template: null
