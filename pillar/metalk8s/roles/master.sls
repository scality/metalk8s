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
      super-admin:
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
