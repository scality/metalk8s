#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

apiVersion: v1
kind: Secret
metadata:
  name: dex-web-server-tls
  namespace: metalk8s-auth
type: Opaque
data:
  tls.crt: "{{
    salt['hashutil.base64_encodefile']('/etc/metalk8s/pki/dex/server.crt')
    | replace('\n', '')
  }}"
  tls.key: "{{
    salt['hashutil.base64_encodefile']('/etc/metalk8s/pki/dex/server.key')
    | replace('\n', '')
  }}"

---

apiVersion: v1
kind: Secret
metadata:
  name: dex-ca-cert
  namespace: metalk8s-auth
type: Opaque
data:
  ca.crt: "{{
    salt['hashutil.base64_encodefile']('/etc/metalk8s/pki/dex/ca.crt')
    | replace('\n', '')
  }}"
