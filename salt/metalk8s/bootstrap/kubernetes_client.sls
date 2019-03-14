Bootstrap kubernetes client:
  salt.state:
    - tgt: local
    - sls: metalk8s.python-kubernetes
    - require:
      - cmd: Bootstrap precheck