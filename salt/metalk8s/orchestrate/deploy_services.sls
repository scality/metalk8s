Wait for kube-apiserver to be ready:
  module.run:
    - metalk8s.wait_apiserver: []
    - require_in:
      - sls: metalk8s.repo.deployed
      - sls: metalk8s.registry.deployed
      - sls: metalk8s.salt.master.deployed

include:
  - metalk8s.repo.deployed
  - metalk8s.registry.deployed
  - metalk8s.salt.master.deployed
