Run bootstrap prechecks:
  salt.state:
    - tgt: local
    - sls: metalk8s.bootstrap.precheck

Set grains:
  salt.state:
    - tgt: local
    - sls: metalk8s.node.grains

Run bootstrap kube client:
  salt.state:
    - tgt: local
    - sls: metalk8s.bootstrap.kubernetes_client
    - pillar:
        repo:
          local_mode: True

Run bootstrap kubelet:
  salt.state:
    - tgt: local
    - sls: metalk8s.bootstrap.kubelet_install
    - pillar:
        repo:
          local_mode: True

Run bootstrap preflight:
  salt.state:
    - tgt: local
    - sls: metalk8s.bootstrap.preflight
    - pillar:
        repo:
          local_mode: True

Run bootstrap kubelet start:
  salt.state:
    - tgt: local
    - sls: metalk8s.bootstrap.kubelet_start

Run bootstrap registry:
  salt.state:
    - tgt: local
    - sls: metalk8s.bootstrap.registry
    - pillar:
        repo:
          local_mode: True

Run bootstrap repo:
  salt.state:
    - tgt: local
    - sls: metalk8s.repo.deployed
    - pillar:
        repo:
          local_mode: True

Run bootstrap salt_master:
  salt.state:
    - tgt: local
    - sls: metalk8s.bootstrap.salt_master
