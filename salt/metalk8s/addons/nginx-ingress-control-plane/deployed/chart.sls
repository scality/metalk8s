#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

apiVersion: metalk8s.scality.com/v1alpha1
kind: IngressNginx
metadata:
  name: ingress-nginx-control-plane
  namespace: metalk8s-ingress
spec:
  controller:
    allowSnippetAnnotations: true
    image:
      digest: null
      repository: {{ build_image_name("nginx-ingress-controller", False) }}
    electionID: ingress-control-plane-controller-leader
    ingressClassResource:
      name: nginx-control-plane
      controllerValue: "k8s.io/ingress-nginx-control-plane"
    ingressClass: nginx-control-plane
    admissionWebhooks:
      enabled: false
    kind: DaemonSet
    updateStrategy:
      type: RollingUpdate
    tolerations:
      - key: "node-role.kubernetes.io/bootstrap"
        operator: "Exists"
        effect: "NoSchedule"
      - key: "node-role.kubernetes.io/master"
        operator: "Exists"
        effect: "NoSchedule"
      - key: "node-role.kubernetes.io/infra"
        operator: "Exists"
        effect: "NoSchedule"
    nodeSelector:
      node-role.kubernetes.io/master: ''
    service:
      type: ClusterIP
      externalIPs: {{ salt.metalk8s_network.get_control_plane_ingress_external_ips() | tojson }}
      enableHttp: false
      ports:
        https: 8443
    extraArgs:
      default-ssl-certificate: "metalk8s-ingress/ingress-control-plane-default-certificate"
      metrics-per-host: false
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
        additionalLabels:
          metalk8s.scality.com/monitor: ''
  defaultBackend:
    enabled: false
