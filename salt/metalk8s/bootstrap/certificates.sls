Bootstrap create certificates:
  salt.state:
    - tgt: bootstrap
    - sls:
      - metalk8s.kubeadm.init.certs.ca
      - metalk8s.kubeadm.init.certs.apiserver
      - metalk8s.kubeadm.init.certs.apiserver-kubelet-client
      - metalk8s.kubeadm.init.certs.sa
      - metalk8s.kubeadm.init.certs.etcd-ca
      - metalk8s.kubeadm.init.certs.etcd-healthcheck-client
      - metalk8s.kubeadm.init.certs.etcd-peer
      - metalk8s.kubeadm.init.certs.etcd-server
      - metalk8s.kubeadm.init.certs.apiserver-etcd-client
      - metalk8s.kubeadm.init.certs.front-proxy-ca
      - metalk8s.kubeadm.init.certs.front-proxy-client
