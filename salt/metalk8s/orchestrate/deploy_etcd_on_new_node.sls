Generate etcd certificates on a new node:
  salt.state:
    - tgt: {{ pillar['node_name'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.kubeadm.init.certs.etcd-server
      - metalk8s.kubeadm.init.certs.etcd-peer
      - metalk8s.kubeadm.init.certs.etcd-healthcheck-client

Refresh the list of etcd nodes:
  module.wait:
    - mine.update:
      - mine_functions: metalk8s.get_etcd_endpoint
