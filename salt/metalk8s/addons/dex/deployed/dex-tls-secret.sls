#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

---
apiVersion: v1
kind: Secret
metadata:
  name: dex-tls-ingress
  namespace: metalk8s-auth
type: Opaque
data:
  tls.crt: "{{ salt['hashutil.base64_encodefile']('/etc/kubernetes/pki/dex-ca.crt') | replace("\n", "") }}"
  tls.key: "{{ salt['hashutil.base64_encodefile']('/etc/kubernetes/pki/dex-ca.key') | replace("\n", "") }}"


---
apiVersion: v1
kind: Secret
metadata:
  name: dex-web-server-tls
  namespace: metalk8s-auth
type: Opaque
data:
  tls.crt: "{{ salt['hashutil.base64_encodefile']('/etc/kubernetes/pki/dex-server.crt') | replace("\n", "") }}"
  tls.key: "{{ salt['hashutil.base64_encodefile']('/etc/kubernetes/pki/dex-server.key') | replace("\n", "") }}"
