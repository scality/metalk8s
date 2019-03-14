Bootstrap registry setup:
  salt.state:
    - tgt: local
    - sls: metalk8s.registry
    - require:
      - salt: Bootstrap kubelet start

Bootsrap registry populate:
  salt.state:
    - tgt: local
    - sls: metalk8s.registry.populated
    - require:
      - salt: Bootstrap registry setup
