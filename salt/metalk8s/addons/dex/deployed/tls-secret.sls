#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import certificates with context %}

apiVersion: v1
kind: Secret
metadata:
  name: dex-web-server-tls
  namespace: metalk8s-auth
type: Opaque
data:
  tls.crt: "{{
    salt['hashutil.base64_encodefile'](
        certificates.server.files.dex.path
    ) | replace('\n', '')
  }}"
  tls.key: "{{
    salt['hashutil.base64_encodefile']('/etc/metalk8s/pki/dex/server.key')
    | replace('\n', '')
  }}"
