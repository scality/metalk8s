Make sure solutions namespace exist:
  metalk8s_kubernetes.namespace_present:
    - name: solutions

Make sure solutions configmap present:
  metalk8s_kubernetes.configmap_present:
    - name: metalk8s-solutions
    - namespace: solutions
    - require:
      - metalk8s_kubernetes: Make sure solutions namespace exist