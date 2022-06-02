# Include here all states that should be called after downgrading

include:
  - metalk8s.addons.prometheus-operator.post-downgrade
  - metalk8s.addons.logging.fluent-bit.deployed.post-downgrade
  - metalk8s.addons.dex.deployed.post-downgrade
