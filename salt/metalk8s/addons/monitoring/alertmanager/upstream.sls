#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

# The content below has been generated from
# https://github.com/coreos/prometheus-operator, v0.29.0 tag,
# with the following command:
#   hack/concat-kubernetes-manifests.sh $(find contrib/kube-prometheus/manifests/ \
#     -name "alertmanager-*.yaml") > upstream.sls
# In the following, only container image registries have been replaced.

---
apiVersion: v1
data:
  alertmanager.yaml: Imdsb2JhbCI6IAogICJyZXNvbHZlX3RpbWVvdXQiOiAiNW0iCiJyZWNlaXZlcnMiOiAKLSAibmFtZSI6ICJudWxsIgoicm91dGUiOiAKICAiZ3JvdXBfYnkiOiAKICAtICJqb2IiCiAgImdyb3VwX2ludGVydmFsIjogIjVtIgogICJncm91cF93YWl0IjogIjMwcyIKICAicmVjZWl2ZXIiOiAibnVsbCIKICAicmVwZWF0X2ludGVydmFsIjogIjEyaCIKICAicm91dGVzIjogCiAgLSAibWF0Y2giOiAKICAgICAgImFsZXJ0bmFtZSI6ICJEZWFkTWFuc1N3aXRjaCIKICAgICJyZWNlaXZlciI6ICJudWxsIg==
kind: Secret
metadata:
  name: alertmanager-main
  namespace: monitoring
type: Opaque
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: alertmanager-main
  namespace: monitoring
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
apiVersion: monitoring.coreos.com/v1
kind: Alertmanager
metadata:
  labels:
    alertmanager: main
  name: main
  namespace: monitoring
spec:
  baseImage: {{ build_image_name('alertmanager') }}
  nodeSelector:
    beta.kubernetes.io/os: linux
    node-role.kubernetes.io/infra: ''
  replicas: 3
  securityContext:
    fsGroup: 2000
    runAsNonRoot: true
    runAsUser: 1000
  serviceAccountName: alertmanager-main
  version: v0.16.0
  tolerations:
  - key: "node-role.kubernetes.io/bootstrap"
    operator: "Exists"
    effect: "NoSchedule"
  - key: "node-role.kubernetes.io/infra"
    operator: "Exists"
    effect: "NoSchedule"
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
