Bootstrap preflight run:
  salt.state:
    - tgt: local
    - sls: metalk8s.kubeadm.init.preflight
    - require:
      - cmd: Bootstrap precheck

