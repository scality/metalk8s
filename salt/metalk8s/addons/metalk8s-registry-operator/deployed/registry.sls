#!jinja | metalk8s_kubernetes
{%- from "metalk8s/map.jinja" import repo with context %}

{#- The operator webhook rejects monitoring until the ServiceMonitor CRD is
    established. On a fresh cluster, prometheus-operator deploys it after this
    state, so monitoring.sls enables monitoring later on. #}
{%- set servicemonitor_crd_established = salt.metalk8s_kubernetes.is_object_ready(
        kind='CustomResourceDefinition',
        apiVersion='apiextensions.k8s.io/v1',
        name='servicemonitors.monitoring.coreos.com',
    ) %}

apiVersion: metalk8s.scality.com/v1alpha1
kind: Registry
metadata:
  name: main
spec:
  namespace: metalk8s-registry
  nodeSelector:
    node-role.kubernetes.io/registry: ""
  tolerations:
    - key: node-role.kubernetes.io/master
      effect: NoSchedule
      operator: Exists
    - key: node-role.kubernetes.io/bootstrap
      effect: NoSchedule
      operator: Exists
    - key: node-role.kubernetes.io/infra
      effect: NoSchedule
      operator: Exists
    - key: node-role.kubernetes.io/registry
      effect: NoSchedule
      operator: Exists
    - key: node-role.kubernetes.io/etcd
      effect: NoSchedule
      operator: Exists
  server:
    certificateIssuerRef:
      name: metalk8s-registry-ca
      kind: ClusterIssuer
  agent:
    certificateIssuerRef:
      name: metalk8s-registry-ca
      kind: ClusterIssuer
    authentication:
      mtls:
        caSecretRef:
          name: metalk8s-registry-agent-auth-ca
          namespace: metalk8s-registry
  mirrorPropagation:
    tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
        operator: Exists
      - key: node-role.kubernetes.io/bootstrap
        effect: NoSchedule
        operator: Exists
      - key: node-role.kubernetes.io/registry
        effect: NoSchedule
        operator: Exists
      - key: node-role.kubernetes.io/infra
        effect: NoSchedule
        operator: Exists
      - key: node-role.kubernetes.io/etcd
        effect: NoSchedule
        operator: Exists
    enabled: true
    ignorePaths:
      # Salt keeps it for the Solutions served by the repositories Pod
      - {{ repo.registry_endpoint }}
{%- if servicemonitor_crd_established %}
  # Keep in sync with monitoring.sls
  monitoring:
    enabled: true
    prometheusLabels:
      metalk8s.scality.com/monitor: ""
{%- endif %}
