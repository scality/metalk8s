{%- set namespace = 'metalk8s' %}

Create namespace '{{ namespace }}':
  metalk8s_kubernetes.namespace_present:
    - name: '{{ namespace }}'
    - kubeconfig: /etc/kubernetes/admin.conf
    - context: kubernetes-admin@kubernetes
