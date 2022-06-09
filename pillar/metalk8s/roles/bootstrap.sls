certificates:
  client:
    files:
      salt-master-etcd:
        watched: True
  kubeconfig:
    files:
      kubelet:
        watched: True
      salt-master:
        watched: True
  server:
    files:
      backup-server:
        watched: True
      control-plane-ingress:
        watched: True
      dex:
        watched: True
      salt-api:
        watched: True
      workload-plane-ingress:
        watched: True
