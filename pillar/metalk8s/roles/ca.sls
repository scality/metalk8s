mine_functions:
  kubernetes_root_ca_b64:
    mine_function: hashutil.base64_encodefile
    fname: /etc/kubernetes/pki/ca.crt

  kubernetes_etcd_ca_b64:
    mine_function: hashutil.base64_encodefile
    fname: /etc/kubernetes/pki/etcd/ca.crt

  kubernetes_front_proxy_ca_b64:
    mine_function: hashutil.base64_encodefile
    fname: /etc/kubernetes/pki/front-proxy-ca.crt

  kubernetes_sa_pub_key_b64:
    mine_function: hashutil.base64_encodefile
    fname: /etc/kubernetes/pki/sa.pub

  dex_ca_b64:
    mine_function: hashutil.base64_encodefile
    fname: /etc/metalk8s/pki/dex/ca.crt

  ingress_ca_b64:
    mine_function: hashutil.base64_encodefile
    fname: /etc/metalk8s/pki/nginx-ingress/ca.crt

x509_signing_policies:
  kube_apiserver_client_policy:
    - minions: '*'
    - signing_private_key: /etc/kubernetes/pki/ca.key
    - signing_cert: /etc/kubernetes/pki/ca.crt
    - keyUsage: critical digitalSignature, keyEncipherment
    - extendedKeyUsage: clientAuth
    - days_valid: 365
  kube_apiserver_server_policy:
    - minions: '*'
    - signing_private_key: /etc/kubernetes/pki/ca.key
    - signing_cert: /etc/kubernetes/pki/ca.crt
    - keyUsage: critical digitalSignature, keyEncipherment
    - extendedKeyUsage: serverAuth
    - days_valid: 365
  etcd_client_policy:
    - minions: '*'
    - signing_private_key: /etc/kubernetes/pki/etcd/ca.key
    - signing_cert: /etc/kubernetes/pki/etcd/ca.crt
    - keyUsage: critical digitalSignature, keyEncipherment
    - extendedKeyUsage: clientAuth
    - days_valid: 365
  etcd_server_client_policy:
    - minions: '*'
    - signing_private_key: /etc/kubernetes/pki/etcd/ca.key
    - signing_cert: /etc/kubernetes/pki/etcd/ca.crt
    - keyUsage: critical digitalSignature, keyEncipherment
    - extendedKeyUsage: serverAuth, clientAuth
    - days_valid: 365
  front_proxy_client_policy:
    - minions: '*'
    - signing_private_key: /etc/kubernetes/pki/front-proxy-ca.key
    - signing_cert: /etc/kubernetes/pki/front-proxy-ca.crt
    - keyUsage: critical digitalSignature, keyEncipherment
    - extendedKeyUsage: clientAuth
    - days_valid: 365
  dex_server_policy:
    - minions: '*'
    - signing_private_key: /etc/metalk8s/pki/dex/ca.key
    - signing_cert: /etc/metalk8s/pki/dex/ca.crt
    - keyUsage: critical digitalSignature, keyEncipherment
    - extendedKeyUsage: serverAuth
    - days_valid: 365
  ingress_server_policy:
    - minions: '*'
    - signing_private_key: /etc/metalk8s/pki/nginx-ingress/ca.key
    - signing_cert: /etc/metalk8s/pki/nginx-ingress/ca.crt
    - keyUsage: critical digitalSignature, keyEncipherment
    - extendedKeyUsage: serverAuth
    - days_valid: 365
