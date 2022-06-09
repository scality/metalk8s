certificates:
  client:
    files:
      etcd-healthcheck:
        watched: True
  kubeconfig:
    files:
      kubelet:
        watched: True
  server:
    files:
      etcd-peer:
        watched: True
      etcd:
        watched: True
