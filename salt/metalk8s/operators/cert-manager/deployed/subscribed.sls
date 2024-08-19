#!jinja | metalk8s_kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: metalk8s-cert-manager
  namespace: operators
spec:
  channel: stable
  name: cert-manager
  source: metalk8s-catalog-source
  sourceNamespace: olm
