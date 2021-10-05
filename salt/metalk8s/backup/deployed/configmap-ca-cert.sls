#!jinja | metalk8s_kubernetes

{%- set ca_cert = salt.file.read('/etc/metalk8s/pki/backup-server/ca.crt') %}

apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-ca-cert
  namespace: kube-system
  labels:
    app.kubernetes.io/name: backup
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/managed-by: salt
data:
  ca.crt: |-
    {{ ca_cert | indent(4, False) }}
