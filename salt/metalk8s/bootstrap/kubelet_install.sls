Bootstrap kubelet install:
  salt.state:
    - tgt: local
    - sls: metalk8s.kubelet
    - require:
      - salt: Bootstrap kubernetes client
