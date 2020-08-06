#
# States to deploy cluster and service configurations
#

# This state is designed to run and create ConfigMaps before its consumers
# (addon services e.g Grafana) are deployed. Consumers depend on this
# default configurations to startup
include:
  - metalk8s.addons.prometheus-operator.deployed.service-configuration
  - metalk8s.addons.dex.deployed.service-configuration
  - metalk8s.addons.logging.loki.deployed.service-configuration
