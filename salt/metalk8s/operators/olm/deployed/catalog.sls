#!jinja | metalk8s_kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

apiVersion: operators.coreos.com/v1alpha1
kind: CatalogSource
metadata:
  name: metalk8s-catalog-source
  namespace: olm
spec:
  sourceType: grpc
  image: {{ build_image_name("metalk8s-catalog-source") }}
  displayName: Metalk8s Operators
  publisher: scality.com
  grpcPodConfig:
    nodeSelector:
      kubernetes.io/os: linux
      node-role.kubernetes.io/infra: ""
    tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
    securityContextConfig: restricted
  updateStrategy:
    registryPoll:
      interval: 60m
