mine_functions:
  kubernetes_ca_server:
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
