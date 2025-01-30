#!jinja | metalk8s_kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

---
apiVersion: olm.operatorframework.io/v1
kind: ClusterCatalog
metadata:
  name: metalk8s-catalog-source
spec:
  source:
    type: Image
    image:
      ref: {{ build_image_name("metalk8s-catalog-source") }}
