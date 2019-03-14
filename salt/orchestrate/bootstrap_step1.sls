Bootstrap salt-master:
  salt.state:
    - tgt: local
    - sls:
      - metalk8s.bootstrap.precheck
      - metalk8s.bootstrap.kubernetes_client
      - metalk8s.bootstrap.kubelet_install
      - metalk8s.bootstrap.preflight
      - metalk8s.bootstrap.kubelet_start
      - metalk8s.bootstrap.registry
      - metalk8s.bootstrap.salt_master
