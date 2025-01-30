#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

apiVersion: metalk8s.scality.com/v1alpha1
kind: IngressNginx
metadata:
  name: ingress-nginx
  namespace: metalk8s-ingress
spec:
  controller:
    allowSnippetAnnotations: true
    image:
      digest: null
      repository: {{ build_image_name("nginx-ingress-controller", False) }}
    hostPort:
      enabled: true
    ingressClassResource:
      default: true
    watchIngressWithoutClass: true
    admissionWebhooks:
      enabled: false
    kind: DaemonSet
    tolerations:
      - key: "node-role.kubernetes.io/bootstrap"
        operator: "Exists"
        effect: "NoSchedule"
      - key: "node-role.kubernetes.io/infra"
        operator: "Exists"
        effect: "NoSchedule"
    service:
      type: ClusterIP
    extraArgs:
      default-backend-service: metalk8s-ui/metalk8s-ui
      default-ssl-certificate: "metalk8s-ingress/ingress-workload-plane-default-certificate"
      metrics-per-host: false
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
        additionalLabels:
          metalk8s.scality.com/monitor: ''
  defaultBackend:
    enabled: false
