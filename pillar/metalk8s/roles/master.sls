certificates:
  client:
    files:
      apiserver-etcd:
        watched: True
      apiserver-kubelet:
        watched: True
      front-proxy:
        watched: True
  kubeconfig:
    files:
      admin:
        watched: True
      calico:
        watched: True
      controller-manager:
        watched: True
      kubelet:
        watched: True
      scheduler:
        watched: True
  server:
    files:
      apiserver:
        watched: True
