#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

apiVersion: v1
kind: Secret
metadata:
  name: ingress-control-plane-default-certificate
  namespace: metalk8s-ingress
type: Opaque
data:
  tls.crt: "{{
    salt['hashutil.base64_encodefile'](
        '/etc/metalk8s/pki/nginx-ingress/control-plane-server.crt'
    ) | replace('\n', '')
  }}"
  tls.key: "{{
    salt['hashutil.base64_encodefile'](
        '/etc/metalk8s/pki/nginx-ingress/control-plane-server.key'
    ) | replace('\n', '')
  }}"
