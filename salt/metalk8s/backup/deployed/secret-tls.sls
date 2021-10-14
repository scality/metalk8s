#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import certificates with context %}

apiVersion: v1
kind: Secret
metadata:
  name: backup-tls
  namespace: kube-system
  labels:
    app.kubernetes.io/name: backup
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/managed-by: salt
type: Opaque
data:
  backup.crt: "{{
    salt["hashutil.base64_encodefile"](
        certificates.server.files["backup-server"].path
    ) | replace("\n", "")
  }}"
  backup.key: "{{
    salt["hashutil.base64_encodefile"]("/etc/metalk8s/pki/backup-server/server.key")
    | replace("\n", "")
  }}"
