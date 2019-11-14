#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

{%- set oidc_service_ip = salt.metalk8s_network.get_oidc_service_ip() %}

---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.19.0
    helm.sh/chart: dex-2.4.0
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
spec:
  clusterIP: {{ oidc_service_ip }}
  ports:
  - name: https
    port: 32000
    targetPort: https
  selector:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/name: dex
  sessionAffinity: None
  type: ClusterIP