#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

{%- from "metalk8s/repo/macro.sls" import metalk8s_repository with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set alertmanager_version = repo.images.get('alertmanager', {}).get('version') %}
{%- if not alertmanager_version %}
  {{ raise('Missing version information for "alertmanager"') }}
{%- endif %}

# The content below has been generated from
# https://github.com/coreos/prometheus-operator, v0.24.0 tag,
# with the following command:
#   hack/concat-kubernetes-manifests.sh $(find contrib/kube-prometheus/manifests/ \
#     -name "alertmanager-*.yaml") > deployed.sls
# In the following, only container image registries have been replaced.

---
apiVersion: v1
data:
  alertmanager.yaml: Z2xvYmFsOgogIHJlc29sdmVfdGltZW91dDogNW0Kcm91dGU6CiAgZ3JvdXBfYnk6IFsnam9iJ10KICBncm91cF93YWl0OiAzMHMKICBncm91cF9pbnRlcnZhbDogNW0KICByZXBlYXRfaW50ZXJ2YWw6IDEyaAogIHJlY2VpdmVyOiAnbnVsbCcKICByb3V0ZXM6CiAgLSBtYXRjaDoKICAgICAgYWxlcnRuYW1lOiBEZWFkTWFuc1N3aXRjaAogICAgcmVjZWl2ZXI6ICdudWxsJwpyZWNlaXZlcnM6Ci0gbmFtZTogJ251bGwnCg==
kind: Secret
metadata:
  name: alertmanager-main
  namespace: monitoring
type: Opaque
---
apiVersion: monitoring.coreos.com/v1
kind: Alertmanager
metadata:
  labels:
    alertmanager: main
  name: main
  namespace: monitoring
spec:
  baseImage: {{ metalk8s_repository }}/alertmanager
  nodeSelector:
    beta.kubernetes.io/os: linux
    node-role.kubernetes.io/infra: ''
  replicas: 3
  serviceAccountName: alertmanager-main
  version: {{ alertmanager_version }}
  tolerations:
  - key: "node-role.kubernetes.io/bootstrap"
    operator: "Exists"
    effect: "NoSchedule"
  - key: "node-role.kubernetes.io/infra"
    operator: "Exists"
    effect: "NoSchedule"
---
apiVersion: v1
kind: Service
metadata:
  labels:
    alertmanager: main
  name: alertmanager-main
  namespace: monitoring
spec:
  ports:
  - name: web
    port: 9093
    targetPort: web
  selector:
    alertmanager: main
    app: alertmanager
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: alertmanager-main
  namespace: monitoring
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    k8s-app: alertmanager
  name: alertmanager
  namespace: monitoring
spec:
  endpoints:
  - interval: 30s
    port: web
  selector:
    matchLabels:
      alertmanager: main
