#!jinja | metalk8s_kubernetes
{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import metalk8s_repository with context %}

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
    image:
      registry: {{ metalk8s_repository }}
    certificateIssuerRef:
      name: metalk8s-registry-ca
      kind: ClusterIssuer
  agent:
    image:
      registry: {{ metalk8s_repository }}
    certificateIssuerRef:
      name: metalk8s-registry-ca
      kind: ClusterIssuer
    authentication:
      mtls:
        caSecretRef:
          name: metalk8s-registry-agent-auth-ca
          namespace: metalk8s-registry
  mirrorPropagation:
    image:
      registry: {{ metalk8s_repository }}
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
      - {{ repo.registry_endpoint }} # This one is still handled by salt until the migration to the new registry is fully completed
{%- if servicemonitor_crd_established %}
  # Keep in sync with monitoring.sls
  monitoring:
    enabled: true
    prometheusLabels:
      metalk8s.scality.com/monitor: ""
{%- endif %}
