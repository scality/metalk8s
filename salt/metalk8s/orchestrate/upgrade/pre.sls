# Include here all states that should be called before upgrading
# NOTE: This state should be called by salt-master using the saltenv of
# the destination version (salt-master should have been upgraded)

include:
  - metalk8s.addons.prometheus-operator.pre-upgrade
