# Include here all states that should be called after downgrading

include:
  - metalk8s.addons.prometheus-operator.post-downgrade
  - metalk8s.addons.logging.loki.deployed.post-downgrade
