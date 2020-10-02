{%- set ca_cert = salt.file.read('/etc/metalk8s/pki/nginx-ingress/ca.crt') %}

Create metalk8s-auth/nginx-ingress-ca-cert ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: nginx-ingress-ca-cert
          namespace: metalk8s-auth
        data:
          ca.crt: |-
            {{ ca_cert | indent(12, False) }}
