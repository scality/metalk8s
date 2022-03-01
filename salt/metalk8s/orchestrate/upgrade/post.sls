# Include here all states that should be called after upgrading

include:
  - metalk8s.addons.prometheus-operator.post-upgrade
  - metalk8s.addons.ui.post-upgrade
  - metalk8s.addons.logging.fluent-bit.deployed.post-upgrade
