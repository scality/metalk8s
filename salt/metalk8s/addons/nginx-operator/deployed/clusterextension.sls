#!jinja | metalk8s_kubernetes

---
apiVersion: olm.operatorframework.io/v1
kind: ClusterExtension
metadata:
  name: nginx-install
spec:
  namespace: nginx-operator
  serviceAccount:
    name: nginx-operator-installer
  source:
    sourceType: Catalog
    catalog:
      packageName: nginx-operator
      version: "v4.12.0"
